<script lang="ts">
	import { onMount } from 'svelte';
	import * as maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
	import type { RouteStopEntry } from '$lib/types/routeStop';
	import { cssVar } from '$lib/utils/color';
	import { safeTop } from '$lib/utils/safeArea';
	import { toLngLat, toLineCoords, boundsFromCoords, calculateBearing, closestRouteIndex } from '$lib/utils/mapHelpers';
	import { fetchRoute, type LatLng, type RouteData } from '$lib/services/routing';
	import type { WeatherPoint } from '$lib/services/weather';
	import type { RoadPoi } from '$lib/services/external/overpass';
	import { classifyPoint } from '$lib/services/alerts';
	import { toaster } from '$lib/stores/toaster';
	import { watchPosition, clearWatch, getLastPosition } from '$lib/services/geolocation';
	import { registerOfflineProtocol, prepareMapStyle } from '$lib/services/offlineTiles';
	import { MapMarkerController } from '$lib/utils/mapMarkerController';
	import { registerRoadPoiIcons, roadPoiPriority } from '$lib/utils/mapPoiIcons';

	let { controlsVisible = true }: { controlsVisible?: boolean } = $props();

	let mapContainer: HTMLDivElement;
	let map = $state<maplibregl.Map | null>(null);
	let mapReady: Promise<void>;
	let resolveReady: () => void;
	let hasInitialPosition = false;
	let gpsLoading = $state(true);
	let markerController: MapMarkerController | null = null;

	const GPS_LOADING_TIMEOUT_MS = 20000;
	const LINE_LAYOUT = { 'line-cap': 'round', 'line-join': 'round' } as const;
	const NAV_ZOOM_BY_KMH: [number, number][] = [[0, 18], [30, 17.2], [60, 16.4], [90, 15.8], [120, 15.2]];
	const NAV_PITCH_BY_KMH: [number, number][] = [[0, 60], [60, 55], [120, 48]];

	const FOLLOW_DURATION_MS = 1000;

	let navigating = false;

	function widthByZoom(near: number, mid: number, far: number): maplibregl.DataDrivenPropertyValueSpecification<number> {
		return ['interpolate', ['linear'], ['zoom'], 10, near, 15, mid, 18, far];
	}

	function interpolateBySpeed(table: [number, number][], kmh: number): number {
		if (kmh <= table[0][0]) return table[0][1];
		for (let i = 1; i < table.length; i++) {
			const [speedAt, value] = table[i];
			if (kmh > speedAt) continue;
			const [prevSpeed, prevValue] = table[i - 1];
			const t = (kmh - prevSpeed) / (speedAt - prevSpeed);
			return prevValue + t * (value - prevValue);
		}
		return table[table.length - 1][1];
	}

	let weatherMarkerEls: maplibregl.Marker[] = [];
	let trackedSourceAdded = false;

	const emptyLine = () => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: [] as [number, number][] } });

	onMount(() => {
		maplibregl.setWorkerUrl(mapWorkerUrl);
		mapReady = new Promise((r) => { resolveReady = r; });
		registerOfflineProtocol();

		let disposed = false;
		let cleanup: (() => void) | null = null;

		(async () => {
			const style = await prepareMapStyle();
			if (disposed) return;

			const lastPos = getLastPosition();
			map = new maplibregl.Map({
				container: mapContainer,
				style,
				center: lastPos ? toLngLat(lastPos) : [-51.9253, -14.235],
				zoom: lastPos ? 13 : 4,
				attributionControl: false
			});
			markerController = new MapMarkerController(map);
			markerController.setNavigating(navigating);
			map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
			map.on('load', () => { addEmptySources(); resolveReady(); });
			map.on('zoom', updateWeatherVisibility);

			const resizeObserver = new ResizeObserver(() => map?.resize());
			resizeObserver.observe(mapContainer);

			const gpsTimeout = setTimeout(() => { gpsLoading = false; }, GPS_LOADING_TIMEOUT_MS);
			watchPosition({
				onPosition(fix) {
					if (!map) return;
					const coords = fix.coords;
					gpsLoading = false;
					clearTimeout(gpsTimeout);
					markerController?.updateRider(coords, fix.accuracyM);
					markerController?.updateOriginVisibility(coords);
					if (!hasInitialPosition) { map.flyTo({ center: toLngLat(coords), zoom: 13 }); hasInitialPosition = true; }
				},
				onError(msg) { gpsLoading = false; toaster.warning({ title: 'Localização indisponível', description: msg }); }
			});

			cleanup = () => {
				clearTimeout(gpsTimeout);
				resizeObserver.disconnect();
				clearWatch();
				markerController?.destroy();
				markerController = null;
				weatherMarkerEls.forEach((marker) => marker.remove());
				map?.remove();
			};
		})();

		return () => { disposed = true; cleanup?.(); };
	});

	function addEmptySources() {
		if (!map) return;
		map.addSource('route', { type: 'geojson', data: emptyLine() });
		map.addLayer({ id: 'route-casing', type: 'line', source: 'route', layout: LINE_LAYOUT, paint: { 'line-color': cssVar('--color-surface-950'), 'line-width': widthByZoom(6, 15, 24), 'line-opacity': 0.85 } });
		map.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: LINE_LAYOUT, paint: { 'line-color': cssVar('--color-ride-route-300'), 'line-width': widthByZoom(4, 10, 17), 'line-opacity': 0.95 } });
		map.addSource('conditions', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
		map.addLayer({ id: 'conditions-line', type: 'line', source: 'conditions', layout: LINE_LAYOUT, paint: { 'line-color': ['get', 'color'], 'line-width': widthByZoom(5, 11, 18), 'line-opacity': ['get', 'opacity'] } });
		map.addSource('approach', { type: 'geojson', data: emptyLine() });
		map.addLayer({ id: 'approach-line', type: 'line', source: 'approach', layout: LINE_LAYOUT, paint: { 'line-color': cssVar('--color-ride-location-300'), 'line-width': widthByZoom(3, 7, 11), 'line-opacity': 0.8, 'line-dasharray': [2, 3] } });
		map.addSource('road-pois', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
		registerRoadPoiIcons(map);
		map.addLayer({
			id: 'road-pois-symbol',
			type: 'symbol',
			source: 'road-pois',
			minzoom: 13,
			layout: {
				'icon-image': ['concat', 'road-poi-', ['get', 'kind']],
				'icon-size': ['interpolate', ['linear'], ['zoom'], 13, 0.58, 18, 0.9],
				'icon-allow-overlap': false,
				'icon-ignore-placement': false,
				'symbol-sort-key': ['get', 'priority']
			}
		});
		map.addSource('tracked', { type: 'geojson', data: emptyLine() });
		map.addLayer({ id: 'tracked-line', type: 'line', source: 'tracked', layout: LINE_LAYOUT, paint: { 'line-color': cssVar('--color-ride-safe-500'), 'line-width': widthByZoom(3, 6, 9), 'line-opacity': 0.95 } });
		trackedSourceAdded = true;
	}

	export function clearRoute() {
		if (!map) return;
		(map.getSource('route') as maplibregl.GeoJSONSource | undefined)?.setData(emptyLine());
		(map.getSource('conditions') as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: [] });
		(map.getSource('approach') as maplibregl.GeoJSONSource | undefined)?.setData(emptyLine());
		(map.getSource('road-pois') as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: [] });
		markerController?.clearRoute();
		weatherMarkerEls.forEach((m) => m.remove()); weatherMarkerEls = [];
	}

	function placeRouteMarkers(originCoords: LatLng, destCoords: LatLng) {
		markerController?.placeEndpoints(originCoords, destCoords);
		const lastPosition = getLastPosition();
		if (lastPosition) markerController?.updateOriginVisibility(lastPosition);
	}

	function renderRouteLine(originCoords: LatLng, destCoords: LatLng, routeData: RouteData, skipFit: boolean): boolean {
		const src = map?.getSource('route') as maplibregl.GeoJSONSource | undefined;
		if (!map || !src) return false;
		src.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: toLineCoords(routeData.coords) } });
		if (!skipFit) map.fitBounds(boundsFromCoords([originCoords, destCoords, ...routeData.coords]), { padding: 40 });
		return true;
	}

	export async function drawRoute(originCoords: LatLng, destCoords: LatLng, waypoints: LatLng[] = [], skipFit = false, bearingDeg: number | null = null): Promise<RouteData | null> {
		if (!map) return null;
		await mapReady;
		clearRoute();
		placeRouteMarkers(originCoords, destCoords);
		const routeData = await fetchRoute(originCoords, destCoords, waypoints, { bearingDeg });
		if (!routeData) return null;
		return renderRouteLine(originCoords, destCoords, routeData, skipFit) ? routeData : null;
	}

	export async function drawStoredRoute(originCoords: LatLng, destCoords: LatLng, routeData: RouteData): Promise<void> {
		if (!map) return;
		await mapReady;
		clearRoute();
		placeRouteMarkers(originCoords, destCoords);
		renderRouteLine(originCoords, destCoords, routeData, false);
	}

	export function showStopMarkers(stops: RouteStopEntry[]) {
		markerController?.showStops(stops);
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

	export function showRoadPois(pois: RoadPoi[]) {
		const source = map?.getSource('road-pois') as maplibregl.GeoJSONSource | undefined;
		if (!source) return;
		source.setData({
			type: 'FeatureCollection',
			features: pois.map((poi) => ({
				type: 'Feature' as const,
				properties: { kind: poi.kind, priority: roadPoiPriority(poi.kind) },
				geometry: { type: 'Point' as const, coordinates: [poi.lon, poi.lat] }
			}))
		});
	}

	export function drawTrackedPath(path: LatLng[]) {
		if (!map || !trackedSourceAdded || path.length < 2) return;
		(map.getSource('tracked') as maplibregl.GeoJSONSource).setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: toLineCoords(path) } });
	}

	export function setNavigating(active: boolean) {
		navigating = active;
		markerController?.setNavigating(active);
	}

	export function followPosition(coords: LatLng, prevCoords?: LatLng, bearingOverride?: number, speedKmh = 0) {
		if (!map) return;
		const bearing = bearingOverride ?? (prevCoords ? calculateBearing(prevCoords, coords) : map.getBearing());
		const duration = FOLLOW_DURATION_MS;
		map.easeTo({
			center: toLngLat(coords),
			zoom: interpolateBySpeed(NAV_ZOOM_BY_KMH, speedKmh),
			bearing,
			pitch: interpolateBySpeed(NAV_PITCH_BY_KMH, speedKmh),
			duration,
			easing: (t) => t
		});
		markerController?.moveRider(coords, bearing, duration);
	}

	export function drawApproachRoute(coords: LatLng[]) {
		if (!map || coords.length < 2) return;
		(map.getSource('approach') as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: toLineCoords(coords) } });
	}

	export function clearApproachRoute() {
		if (!map) return;
		(map.getSource('approach') as maplibregl.GeoJSONSource | undefined)?.setData(emptyLine());
	}

	export function reloadBaseTiles() {
		if (!map) return;
		for (const [sourceId, source] of Object.entries(map.getStyle().sources)) {
			if (source.type === 'vector' || source.type === 'raster' || source.type === 'raster-dem') {
				map.refreshTiles(sourceId);
			}
		}
		map.triggerRepaint();
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
	.hide-controls :global(.maplibregl-ctrl-attrib),
	.hide-controls :global(.maplibregl-ctrl) { display: none; }
</style>
