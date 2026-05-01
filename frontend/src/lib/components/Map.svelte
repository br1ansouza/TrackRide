<script lang="ts">
	import { onMount } from 'svelte';
	import type L from 'leaflet';
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
	let map = $state<L.Map | null>(null);
	let routeLayer = $state<L.Polyline | null>(null);
	let conditionLayers = $state<L.Polyline[]>([]);
	let originMarker = $state<L.CircleMarker | null>(null);
	let destinationMarker = $state<L.CircleMarker | null>(null);
	let weatherMarkers = $state<L.Marker[]>([]);
	let stopMarkers = $state<L.CircleMarker[]>([]);
	let locationMarker = $state<L.CircleMarker | null>(null);
	let hasInitialPosition = false;
	let gpsLoading = $state(true);

	let leaflet: typeof L;

	onMount(() => {
		(async () => {
			leaflet = (await import('leaflet')).default;
			await import('leaflet/dist/leaflet.css');

			map = leaflet.map(mapContainer).setView(
				getLastPosition() ?? [-14.235, -51.9253],
				getLastPosition() ? 13 : 6
			);

			leaflet
				.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
					attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
				})
				.addTo(map);

			setTimeout(() => map?.invalidateSize(), 0);

			await watchPosition({
				onPosition(coords) {
					if (!map || !leaflet) return;
					gpsLoading = false;
					if (locationMarker) {
						locationMarker.setLatLng(coords);
					} else {
						locationMarker = leaflet
							.circleMarker(coords, {
								radius: 8,
								color: cssVar('--color-ride-location-700'),
								fillColor: cssVar('--color-ride-location-500'),
								fillOpacity: 0.9
							})
							.addTo(map)
							.bindPopup('Você está aqui');
					}
					if (!hasInitialPosition) {
						map.setView(coords, 13);
						hasInitialPosition = true;
					}
				},
				onError(message) {
					gpsLoading = false;
					toaster.warning({ title: 'Localização indisponível', description: message });
				}
			});
		})();

		return () => {
			clearWatch();
			map?.remove();
		};
	});

	function clearRoute() {
		map?.off('zoomend', updateWeatherVisibility);
		routeLayer?.remove();
		routeLayer = null;
		conditionLayers.forEach((l) => l.remove());
		conditionLayers = [];
		originMarker?.remove();
		originMarker = null;
		destinationMarker?.remove();
		destinationMarker = null;
		weatherMarkers.forEach((m) => m.remove());
		weatherMarkers = [];
		stopMarkers.forEach((m) => m.remove());
		stopMarkers = [];
	}

	export async function drawRoute(
		originCoords: LatLng,
		destCoords: LatLng,
		waypoints: LatLng[] = []
	): Promise<RouteData | null> {
		if (!map || !leaflet) return null;

		clearRoute();

		originMarker = leaflet
			.circleMarker(originCoords, {
				radius: 8,
				color: cssVar('--color-ride-safe-700'),
				fillColor: cssVar('--color-ride-safe-500'),
				fillOpacity: 0.9
			})
			.addTo(map)
			.bindPopup('Origem');
		destinationMarker = leaflet
			.circleMarker(destCoords, {
				radius: 8,
				color: cssVar('--color-ride-danger-700'),
				fillColor: cssVar('--color-ride-danger-500'),
				fillOpacity: 0.9
			})
			.addTo(map)
			.bindPopup('Destino');

		const routeData = await fetchRoute(originCoords, destCoords, waypoints);
		if (!routeData) return null;

		routeLayer = leaflet
			.polyline(routeData.coords, { color: cssVar('--color-ride-route-500'), weight: 5, opacity: 0.8 })
			.addTo(map);

		map.fitBounds(routeLayer.getBounds(), { padding: [40, 40] });
		return routeData;
	}

	export function showStopMarkers(stops: RouteStopEntry[]) {
		if (!map || !leaflet) return;
		stopMarkers.forEach((m) => m.remove());
		stopMarkers = stops.map((stop) => {
			const sc = stopColor(stop.stopType);
			return leaflet
				.circleMarker(stop.coords, {
					radius: 7,
					color: cssVar(sc.bg),
					fillColor: cssVar(sc.marker),
					fillOpacity: 0.9
				})
				.addTo(map!)
				.bindPopup(stop.name);
		});
	}

	function updateWeatherVisibility() {
		if (!map || weatherMarkers.length === 0) return;
		const zoom = map.getZoom();
		const total = weatherMarkers.length;

		let step: number;
		if (zoom >= 11) step = 1;
		else if (zoom >= 9) step = Math.ceil(total / 8);
		else if (zoom >= 7) step = Math.ceil(total / 4);
		else step = Math.ceil(total / 2);

		weatherMarkers.forEach((marker, i) => {
			const isFirst = i === 0;
			const isLast = i === total - 1;
			const isVisible = isFirst || isLast || i % step === 0;

			if (isVisible) {
				if (!map!.hasLayer(marker)) marker.addTo(map!);
			} else {
				marker.remove();
			}
		});
	}

	function closestRouteIndex(routeCoords: LatLng[], target: LatLng): number {
		let bestIdx = 0;
		let bestDist = Infinity;
		for (let i = 0; i < routeCoords.length; i++) {
			const dlat = routeCoords[i][0] - target[0];
			const dlon = routeCoords[i][1] - target[1];
			const dist = dlat * dlat + dlon * dlon;
			if (dist < bestDist) {
				bestDist = dist;
				bestIdx = i;
			}
		}
		return bestIdx;
	}

	export function showRouteConditions(routeCoords: LatLng[], points: WeatherPoint[]) {
		if (!map || !leaflet || points.length < 2) return;
		conditionLayers.forEach((l) => l.remove());
		conditionLayers = [];

		const indices = points.map((p) => closestRouteIndex(routeCoords, p.coords));

		for (let i = 0; i < points.length - 1; i++) {
			const alerts = classifyPoint(points[i]);
			if (alerts.length === 0) continue;

			const segment = routeCoords.slice(indices[i], indices[i + 1] + 1);
			if (segment.length < 2) continue;

			const weatherAlerts = alerts.filter((a) => a.type !== 'night');
			const isNight = alerts.some((a) => a.type === 'night');

			if (weatherAlerts.length > 0) {
				const hasDanger = weatherAlerts.some((a) => a.severity === 'danger');
				const color = cssVar(hasDanger ? '--color-ride-danger-300' : '--color-ride-alert-300');
				const layer = leaflet.polyline(segment, { color, weight: 6, opacity: 0.9 }).addTo(map);
				conditionLayers.push(layer);
			} else if (isNight) {
				const color = cssVar('--color-ride-route-800');
				const layer = leaflet.polyline(segment, { color, weight: 6, opacity: 0.4 }).addTo(map);
				conditionLayers.push(layer);
			}
		}
	}

	export function showWeatherMarkers(points: WeatherPoint[]) {
		if (!map || !leaflet) return;
		weatherMarkers.forEach((m) => m.remove());
		weatherMarkers = points.map((p) => {
			const icon = leaflet.divIcon({
				className: 'leaflet-div-icon-weather',
				html: `<div style="display:flex;flex-direction:column;align-items:center;background:rgba(0,0,0,0.6);border-radius:8px;padding:8px 16px 12px;pointer-events:none;">
					<img src="https://openweathermap.org/img/wn/${p.icon}.png" width="24" height="24" alt="${p.description}"/>
					<span style="color:#fff;font-size:10px;font-weight:700;line-height:1;">${p.temp}°C</span>
					<span style="color:#fff;font-size:9px;opacity:0.8;line-height:1;margin-top:2px;text-transform:capitalize;">${p.description}</span>
				</div>`,
				iconSize: [80, 66],
				iconAnchor: [40, 33]
			});
			return leaflet.marker(p.coords, { icon, interactive: false });
		});
		updateWeatherVisibility();
		map.on('zoomend', updateWeatherVisibility);
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
	:global(.leaflet-div-icon-weather) {
		background: none !important;
		border: none !important;
	}
	.hide-controls :global(.leaflet-control-zoom),
	.hide-controls :global(.leaflet-control-attribution) {
		display: none;
	}
</style>
