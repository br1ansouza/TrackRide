<script lang="ts">
	import { onMount, mount } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { Flag, MapPin, Navigation2 } from 'lucide-svelte';
	import { stopIcon } from '$lib/utils/stopIcons';
	import type { RouteStopEntry } from '$lib/types/routeStop';
	import { cssVar } from '$lib/utils/color';
	import { stopColor } from '$lib/utils/stopColors';
	import { safeTop } from '$lib/utils/safeArea';
	import { toLngLat, toLineCoords, boundsFromCoords, calculateBearing, closestRouteIndex, haversineM } from '$lib/utils/mapHelpers';
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
	let originMarker: maplibregl.Marker | null = null;
	let originPoint: LatLng | null = null;
	let routeMarkers: maplibregl.Marker[] = [];

	const ORIGIN_HIDE_RADIUS_M = 50;

	function updateOriginVisibility(userPosition: LatLng) {
		if (!originMarker || !originPoint) return;
		const near = haversineM(userPosition, originPoint) < ORIGIN_HIDE_RADIUS_M;
		originMarker.getElement().style.display = near ? 'none' : '';
	}
	let weatherMarkerEls: maplibregl.Marker[] = [];
	let stopMarkerEls: maplibregl.Marker[] = [];
	let trackedSourceAdded = false;

	const emptyLine = () => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: [] as [number, number][] } });

	function createIconMarker(icon: typeof Flag, background: string, size = 26, iconSize = 14, solid = false): HTMLDivElement {
		const el = document.createElement('div');
		const iconColor = cssVar('--color-surface-50');
		el.style.cssText = `display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:${background};border:2px solid ${iconColor};box-shadow:0 1px 4px rgba(0,0,0,0.4);`;
		mount(icon, { target: el, props: { size: iconSize, color: iconColor, fill: solid ? iconColor : 'none' } });
		return el;
	}

	function createDestinationMarker(): HTMLDivElement {
		const el = document.createElement('div');
		el.style.cssText = 'filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5));';
		mount(MapPin, { target: el, props: { size: 34, color: cssVar('--color-surface-50'), fill: cssVar('--color-ride-danger-500'), strokeWidth: 1.5 } });
		return el;
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
		map.on('load', () => { addEmptySources(); resolveReady(); });

		const resizeObserver = new ResizeObserver(() => map?.resize());
		resizeObserver.observe(mapContainer);

		watchPosition({
			onPosition(coords) {
				if (!map) return;
				gpsLoading = false;
				const lngLat = toLngLat(coords);
				if (locationMarker) { locationMarker.setLngLat(lngLat); }
				else {
					const el = createIconMarker(Navigation2, cssVar('--color-ride-location-500'), 28, 15, true);
					el.classList.add('user-position-marker');
					locationMarker = new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map!);
				}
				updateOriginVisibility(coords);
				if (!hasInitialPosition) { map.flyTo({ center: lngLat, zoom: 13 }); hasInitialPosition = true; }
			},
			onError(msg) { gpsLoading = false; toaster.warning({ title: 'Localização indisponível', description: msg }); }
		});

		return () => { resizeObserver.disconnect(); clearWatch(); map?.remove(); };
	});

	function addEmptySources() {
		if (!map) return;
		map.addSource('route', { type: 'geojson', data: emptyLine() });
		map.addLayer({ id: 'route-line', type: 'line', source: 'route', paint: { 'line-color': cssVar('--color-ride-route-300'), 'line-width': 5, 'line-opacity': 0.9 } });
		map.addSource('conditions', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
		map.addLayer({ id: 'conditions-line', type: 'line', source: 'conditions', paint: { 'line-color': ['get', 'color'], 'line-width': 6, 'line-opacity': ['get', 'opacity'] } });
		map.addSource('approach', { type: 'geojson', data: emptyLine() });
		map.addLayer({ id: 'approach-line', type: 'line', source: 'approach', paint: { 'line-color': cssVar('--color-ride-location-300'), 'line-width': 4, 'line-opacity': 0.8, 'line-dasharray': [2, 3] } });
		map.addSource('tracked', { type: 'geojson', data: emptyLine() });
		map.addLayer({ id: 'tracked-line', type: 'line', source: 'tracked', paint: { 'line-color': cssVar('--color-ride-safe-500'), 'line-width': 4, 'line-opacity': 0.9 } });
		trackedSourceAdded = true;
	}

	function clearRoute() {
		if (!map) return;
		(map.getSource('route') as maplibregl.GeoJSONSource | undefined)?.setData(emptyLine());
		(map.getSource('conditions') as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: [] });
		(map.getSource('approach') as maplibregl.GeoJSONSource | undefined)?.setData(emptyLine());
		routeMarkers.forEach((m) => m.remove()); routeMarkers = [];
		weatherMarkerEls.forEach((m) => m.remove()); weatherMarkerEls = [];
		stopMarkerEls.forEach((m) => m.remove()); stopMarkerEls = [];
		originMarker = null;
		originPoint = null;
	}

	export async function drawRoute(originCoords: LatLng, destCoords: LatLng, waypoints: LatLng[] = [], skipFit = false): Promise<RouteData | null> {
		if (!map) return null;
		await mapReady;
		clearRoute();
		originMarker = new maplibregl.Marker({ element: createIconMarker(Flag, cssVar('--color-ride-safe-500')) }).setLngLat(toLngLat(originCoords)).setPopup(new maplibregl.Popup().setText('Origem')).addTo(map);
		originPoint = originCoords;
		routeMarkers.push(
			originMarker,
			new maplibregl.Marker({ element: createDestinationMarker(), anchor: 'bottom' }).setLngLat(toLngLat(destCoords)).setPopup(new maplibregl.Popup().setText('Destino')).addTo(map)
		);
		const lastPosition = getLastPosition();
		if (lastPosition) updateOriginVisibility(lastPosition);
		const routeData = await fetchRoute(originCoords, destCoords, waypoints);
		if (!routeData || !map) return null;
		const src = map.getSource('route') as maplibregl.GeoJSONSource | undefined;
		if (!src) return null;
		src.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: toLineCoords(routeData.coords) } });
		if (!skipFit) map.fitBounds(boundsFromCoords([originCoords, destCoords, ...routeData.coords]), { padding: 40 });
		return routeData;
	}

	export function showStopMarkers(stops: RouteStopEntry[]) {
		if (!map) return;
		stopMarkerEls.forEach((m) => m.remove());
		stopMarkerEls = stops.map((s) => {
			const sc = stopColor(s.stopType);
			return new maplibregl.Marker({ element: createIconMarker(stopIcon(s.stopType), cssVar(sc.marker), 24, 13) }).setLngLat(toLngLat(s.coords)).setPopup(new maplibregl.Popup().setText(s.name)).addTo(map!);
		});
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
				const color = cssVar(weatherAlerts.some((a) => a.severity === 'danger') ? '--color-ride-danger-300' : '--color-ride-alert-300');
				features.push({ type: 'Feature', properties: { color, opacity: 0.9 }, geometry: { type: 'LineString', coordinates: toLineCoords(segment) } });
			} else if (isNight) {
				features.push({ type: 'Feature', properties: { color: cssVar('--color-ride-route-300'), opacity: 0.5 }, geometry: { type: 'LineString', coordinates: toLineCoords(segment) } });
			}
		}
		(map.getSource('conditions') as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features });
	}

	export function showWeatherMarkers(points: WeatherPoint[]) {
		if (!map) return;
		weatherMarkerEls.forEach((m) => m.remove());
		weatherMarkerEls = points.map((p) => {
			const el = document.createElement('div');
			el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;background:rgba(0,0,0,0.6);border-radius:8px;padding:8px 16px 12px;pointer-events:none;"><img src="https://openweathermap.org/img/wn/${p.icon}.png" width="24" height="24" alt="${p.description}"/><span style="color:#fff;font-size:10px;font-weight:700;line-height:1;">${p.temp}°C</span><span style="color:#fff;font-size:9px;opacity:0.8;line-height:1;margin-top:2px;text-transform:capitalize;">${p.description}</span></div>`;
			return new maplibregl.Marker({ element: el }).setLngLat(toLngLat(p.coords)).addTo(map!);
		});
		updateWeatherVisibility();
		map.on('zoom', updateWeatherVisibility);
	}

	function updateWeatherVisibility() {
		if (!map || weatherMarkerEls.length === 0) return;
		const zoom = map.getZoom();
		const total = weatherMarkerEls.length;
		const step = zoom >= 11 ? 1 : zoom >= 9 ? Math.ceil(total / 8) : zoom >= 7 ? Math.ceil(total / 4) : Math.ceil(total / 2);
		weatherMarkerEls.forEach((m, i) => { m.getElement().style.display = i === 0 || i === total - 1 || i % step === 0 ? '' : 'none'; });
	}

	export function fitRoute() {
		if (!map) return;
		const data = (map.getSource('route') as unknown as { _data: { geometry?: { coordinates: [number, number][] } } })?._data;
		if (!data?.geometry?.coordinates?.length) return;
		const bounds = new maplibregl.LngLatBounds();
		data.geometry.coordinates.forEach((c) => bounds.extend(c));
		map.fitBounds(bounds, { padding: 40, bearing: 0, pitch: 0 });
	}

	export function zoomStreet() {
		if (!map) return;
		const last = getLastPosition();
		map.easeTo({ center: last ? toLngLat(last) : map.getCenter().toArray() as [number, number], zoom: 18, duration: 500 });
	}

	export function drawTrackedPath(path: LatLng[]) {
		if (!map || !trackedSourceAdded || path.length < 2) return;
		(map.getSource('tracked') as maplibregl.GeoJSONSource).setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: toLineCoords(path) } });
	}

	export function followPosition(coords: LatLng, prevCoords?: LatLng, bearingOverride?: number) {
		if (!map) return;
		const bearing = bearingOverride ?? (prevCoords ? calculateBearing(prevCoords, coords) : map.getBearing());
		map.easeTo({ center: toLngLat(coords), zoom: 18, bearing, pitch: 60, duration: 1000 });
	}

	export function drawApproachRoute(coords: LatLng[]) {
		if (!map || coords.length < 2) return;
		(map.getSource('approach') as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: toLineCoords(coords) } });
	}

	export function clearApproachRoute() {
		if (!map) return;
		(map.getSource('approach') as maplibregl.GeoJSONSource | undefined)?.setData(emptyLine());
	}

	export function clearTracking() {
		if (!map || !trackedSourceAdded) return;
		(map.getSource('tracked') as maplibregl.GeoJSONSource).setData(emptyLine());
		map.easeTo({ bearing: 0, pitch: 0, duration: 500 });
	}
</script>

<div class="relative h-full w-full">
	<div bind:this={mapContainer} class="h-full w-full rounded-lg" class:hide-controls={!controlsVisible} style="min-height: 100%;"></div>
	{#if gpsLoading}
		<div class="pointer-events-none absolute inset-x-0 z-[600] flex justify-center" style="top: {safeTop};">
			<div class="flex items-center gap-2 rounded-full bg-surface-900/90 px-4 py-2 shadow-lg backdrop-blur-sm">
				<div class="h-4 w-4 animate-spin rounded-full border-2 border-surface-400 border-t-primary-400"></div>
				<span class="text-sm text-surface-300">Localizando…</span>
			</div>
		</div>
	{/if}
</div>

<style>
	:global(.user-position-marker) {
		position: relative;
	}

	:global(.user-position-marker)::before {
		content: '';
		position: absolute;
		inset: -6px;
		border-radius: 50%;
		background: var(--color-ride-location-500);
		animation: user-pulse 2s ease-out infinite;
		z-index: -1;
	}

	@keyframes user-pulse {
		0% { transform: scale(0.6); opacity: 0.4; }
		70%, 100% { transform: scale(1.3); opacity: 0; }
	}

	.hide-controls :global(.maplibregl-ctrl-attrib),
	.hide-controls :global(.maplibregl-ctrl) { display: none; }
</style>
