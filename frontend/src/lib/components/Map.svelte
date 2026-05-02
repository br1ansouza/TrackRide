<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { RouteStopEntry } from '$lib/components/RouteStops.svelte';
	import { cssVar } from '$lib/utils/color';
	import { stopColor } from '$lib/utils/stopColors';
	import { fetchRoute, type LatLng, type RouteData } from '$lib/services/routing';
	import type { WeatherPoint } from '$lib/services/weather';
	import { classifyPoint } from '$lib/services/alerts';
	import { toaster } from '$lib/stores/toaster';
	import { watchPosition, clearWatch, getLastPosition } from '$lib/services/geolocation';

	let { controlsVisible = true }: { controlsVisible?: boolean } = $props();

	let mapContainer: HTMLDivElement;
	let map = $state<maplibregl.Map | null>(null);
	let mapReady: Promise<void>;
	let resolveReady: () => void;
	let hasInitialPosition = false;
	let gpsLoading = $state(true);
	let locationMarker: maplibregl.Marker | null = null;
	let routeMarkers: maplibregl.Marker[] = [];
	let weatherMarkerEls: maplibregl.Marker[] = [];
	let stopMarkerEls: maplibregl.Marker[] = [];
	let trackedSourceAdded = false;

	function toLngLat(coords: LatLng): [number, number] {
		return [coords[1], coords[0]];
	}

	function toLineCoords(coords: LatLng[]): [number, number][] {
		return coords.map(toLngLat);
	}

	function boundsFromCoords(coords: LatLng[]): maplibregl.LngLatBounds {
		const bounds = new maplibregl.LngLatBounds();
		coords.forEach((c) => bounds.extend(toLngLat(c)));
		return bounds;
	}

	onMount(() => {
		mapReady = new Promise((r) => { resolveReady = r; });
		const lastPos = getLastPosition();
		map = new maplibregl.Map({
			container: mapContainer,
			style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
			center: lastPos ? toLngLat(lastPos) : [-51.9253, -14.235],
			zoom: lastPos ? 13 : 4,
			attributionControl: false
		});

		map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

		map.on('load', () => {
			addEmptySources();
			resolveReady();
		});

		watchPosition({
			onPosition(coords) {
				if (!map) return;
				gpsLoading = false;
				const lngLat = toLngLat(coords);
				if (locationMarker) {
					locationMarker.setLngLat(lngLat);
				} else {
					const el = document.createElement('div');
					el.style.cssText = `width:16px;height:16px;border-radius:50%;background:${cssVar('--color-ride-location-500')};border:2px solid ${cssVar('--color-ride-location-700')};`;
					locationMarker = new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map!);
				}
				if (!hasInitialPosition) {
					map.flyTo({ center: lngLat, zoom: 13 });
					hasInitialPosition = true;
				}
			},
			onError(message) {
				gpsLoading = false;
				toaster.warning({ title: 'Localização indisponível', description: message });
			}
		});

		return () => {
			clearWatch();
			map?.remove();
		};
	});

	function addEmptySources() {
		if (!map) return;
		const emptyLine = { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: [] as [number, number][] } };

		map.addSource('route', { type: 'geojson', data: emptyLine });
		map.addLayer({ id: 'route-line', type: 'line', source: 'route', paint: { 'line-color': cssVar('--color-ride-route-300'), 'line-width': 5, 'line-opacity': 0.9 } });

		map.addSource('conditions', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
		map.addLayer({ id: 'conditions-line', type: 'line', source: 'conditions', paint: { 'line-color': ['get', 'color'], 'line-width': 6, 'line-opacity': ['get', 'opacity'] } });

		map.addSource('tracked', { type: 'geojson', data: emptyLine });
		map.addLayer({ id: 'tracked-line', type: 'line', source: 'tracked', paint: { 'line-color': cssVar('--color-ride-safe-500'), 'line-width': 4, 'line-opacity': 0.9 } });
		trackedSourceAdded = true;
	}

	function clearRoute() {
		if (!map) return;
		const routeSrc = map.getSource('route') as maplibregl.GeoJSONSource | undefined;
		routeSrc?.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } });
		const condSrc = map.getSource('conditions') as maplibregl.GeoJSONSource | undefined;
		condSrc?.setData({ type: 'FeatureCollection', features: [] });
		routeMarkers.forEach((m) => m.remove());
		routeMarkers = [];
		weatherMarkerEls.forEach((m) => m.remove());
		weatherMarkerEls = [];
		stopMarkerEls.forEach((m) => m.remove());
		stopMarkerEls = [];
	}

	function createCircleMarker(color: string, borderColor: string, size = 16): HTMLDivElement {
		const el = document.createElement('div');
		el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${color || '#888'};border:2px solid ${borderColor || '#555'};`;
		return el;
	}

	export async function drawRoute(originCoords: LatLng, destCoords: LatLng, waypoints: LatLng[] = [], skipFit = false): Promise<RouteData | null> {
		if (!map) return null;
		await mapReady;
		clearRoute();

		const originEl = createCircleMarker(cssVar('--color-ride-safe-500'), cssVar('--color-ride-safe-700'));
		const destEl = createCircleMarker(cssVar('--color-ride-danger-500'), cssVar('--color-ride-danger-700'));
		routeMarkers.push(new maplibregl.Marker({ element: originEl }).setLngLat(toLngLat(originCoords)).setPopup(new maplibregl.Popup().setText('Origem')).addTo(map));
		routeMarkers.push(new maplibregl.Marker({ element: destEl }).setLngLat(toLngLat(destCoords)).setPopup(new maplibregl.Popup().setText('Destino')).addTo(map));

		const routeData = await fetchRoute(originCoords, destCoords, waypoints);
		if (!routeData || !map) return null;

		const routeSrc = map.getSource('route') as maplibregl.GeoJSONSource | undefined;
		if (!routeSrc) return null;
		routeSrc.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: toLineCoords(routeData.coords) } });

		if (!skipFit) map.fitBounds(boundsFromCoords([originCoords, destCoords, ...routeData.coords]), { padding: 40 });
		return routeData;
	}

	export function showStopMarkers(stops: RouteStopEntry[]) {
		if (!map) return;
		stopMarkerEls.forEach((m) => m.remove());
		stopMarkerEls = stops.map((stop) => {
			const sc = stopColor(stop.stopType);
			const el = createCircleMarker(cssVar(sc.marker), cssVar(sc.bg), 14);
			return new maplibregl.Marker({ element: el }).setLngLat(toLngLat(stop.coords)).setPopup(new maplibregl.Popup().setText(stop.name)).addTo(map!);
		});
	}

	function closestRouteIndex(routeCoords: LatLng[], target: LatLng): number {
		let bestIdx = 0;
		let bestDist = Infinity;
		for (let i = 0; i < routeCoords.length; i++) {
			const dlat = routeCoords[i][0] - target[0];
			const dlon = routeCoords[i][1] - target[1];
			const dist = dlat * dlat + dlon * dlon;
			if (dist < bestDist) { bestDist = dist; bestIdx = i; }
		}
		return bestIdx;
	}

	export function showRouteConditions(routeCoords: LatLng[], points: WeatherPoint[]) {
		if (!map || points.length < 2) return;
		const indices = points.map((p) => closestRouteIndex(routeCoords, p.coords));
		const features: { type: 'Feature'; properties: Record<string, unknown>; geometry: { type: 'LineString'; coordinates: [number, number][] } }[] = [];

		for (let i = 0; i < points.length - 1; i++) {
			const alerts = classifyPoint(points[i]);
			if (alerts.length === 0) continue;
			const segment = routeCoords.slice(indices[i], indices[i + 1] + 1);
			if (segment.length < 2) continue;

			const weatherAlerts = alerts.filter((a) => a.type !== 'night');
			const isNight = alerts.some((a) => a.type === 'night');

			if (weatherAlerts.length > 0) {
				const hasDanger = weatherAlerts.some((a) => a.severity === 'danger');
				features.push({ type: 'Feature', properties: { color: cssVar(hasDanger ? '--color-ride-danger-300' : '--color-ride-alert-300'), opacity: 0.9 }, geometry: { type: 'LineString', coordinates: toLineCoords(segment) } });
			} else if (isNight) {
				features.push({ type: 'Feature', properties: { color: cssVar('--color-ride-route-300'), opacity: 0.5 }, geometry: { type: 'LineString', coordinates: toLineCoords(segment) } });
			}
		}

		const condSrc = map.getSource('conditions') as maplibregl.GeoJSONSource | undefined;
		if (!condSrc) return;
		condSrc.setData({ type: 'FeatureCollection', features });
	}

	export function showWeatherMarkers(points: WeatherPoint[]) {
		if (!map) return;
		weatherMarkerEls.forEach((m) => m.remove());
		weatherMarkerEls = points.map((p) => {
			const el = document.createElement('div');
			el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;background:rgba(0,0,0,0.6);border-radius:8px;padding:8px 16px 12px;pointer-events:none;">
				<img src="https://openweathermap.org/img/wn/${p.icon}.png" width="24" height="24" alt="${p.description}"/>
				<span style="color:#fff;font-size:10px;font-weight:700;line-height:1;">${p.temp}°C</span>
				<span style="color:#fff;font-size:9px;opacity:0.8;line-height:1;margin-top:2px;text-transform:capitalize;">${p.description}</span>
			</div>`;
			return new maplibregl.Marker({ element: el }).setLngLat(toLngLat(p.coords)).addTo(map!);
		});
		updateWeatherVisibility();
		map.on('zoom', updateWeatherVisibility);
	}

	function updateWeatherVisibility() {
		if (!map || weatherMarkerEls.length === 0) return;
		const zoom = map.getZoom();
		const total = weatherMarkerEls.length;

		let step: number;
		if (zoom >= 11) step = 1;
		else if (zoom >= 9) step = Math.ceil(total / 8);
		else if (zoom >= 7) step = Math.ceil(total / 4);
		else step = Math.ceil(total / 2);

		weatherMarkerEls.forEach((marker, i) => {
			const isVisible = i === 0 || i === total - 1 || i % step === 0;
			marker.getElement().style.display = isVisible ? '' : 'none';
		});
	}

	function calculateBearing(from: LatLng, to: LatLng): number {
		const dLon = ((to[1] - from[1]) * Math.PI) / 180;
		const lat1 = (from[0] * Math.PI) / 180;
		const lat2 = (to[0] * Math.PI) / 180;
		const y = Math.sin(dLon) * Math.cos(lat2);
		const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
		return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
	}

	export function fitRoute() {
		if (!map) return;
		const src = map.getSource('route') as maplibregl.GeoJSONSource | undefined;
		if (!src) return;
		const data = (src as unknown as { _data: { geometry?: { coordinates: [number, number][] } } })._data;
		if (!data?.geometry?.coordinates?.length) return;
		const bounds = new maplibregl.LngLatBounds();
		data.geometry.coordinates.forEach((c) => bounds.extend(c));
		map.fitBounds(bounds, { padding: 40, bearing: 0, pitch: 0 });
	}

	export function zoomStreet() {
		if (!map) return;
		const last = getLastPosition();
		if (last) {
			map.easeTo({ center: toLngLat(last), zoom: 18, duration: 500 });
		} else {
			map.easeTo({ zoom: 18, duration: 500 });
		}
	}

	export function drawTrackedPath(path: LatLng[]) {
		if (!map || !trackedSourceAdded || path.length < 2) return;
		const src = map.getSource('tracked') as maplibregl.GeoJSONSource;
		src.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: toLineCoords(path) } });
	}

	export function followPosition(coords: LatLng, prevCoords?: LatLng) {
		if (!map) return;
		const bearing = prevCoords ? calculateBearing(prevCoords, coords) : map.getBearing();
		map.easeTo({ center: toLngLat(coords), zoom: 18, bearing, pitch: 60, duration: 1000 });
	}

	export function clearTracking() {
		if (!map || !trackedSourceAdded) return;
		const src = map.getSource('tracked') as maplibregl.GeoJSONSource;
		src.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } });
		map.easeTo({ bearing: 0, pitch: 0, duration: 500 });
	}
</script>

<div class="relative h-full w-full">
	<div bind:this={mapContainer} class="h-full w-full rounded-lg" class:hide-controls={!controlsVisible} style="min-height: 100%;"></div>

	{#if gpsLoading}
		<div class="absolute inset-x-0 top-4 z-[600] flex justify-center">
			<div class="flex items-center gap-2 rounded-full bg-surface-900/90 px-4 py-2 shadow-lg backdrop-blur-sm">
				<div class="h-4 w-4 animate-spin rounded-full border-2 border-surface-400 border-t-primary-400"></div>
				<span class="text-sm text-surface-300">Localizando…</span>
			</div>
		</div>
	{/if}
</div>

<style>
	.hide-controls :global(.maplibregl-ctrl-attrib),
	.hide-controls :global(.maplibregl-ctrl) {
		display: none;
	}
</style>
