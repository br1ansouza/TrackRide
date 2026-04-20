<script lang="ts">
	import { onMount } from 'svelte';
	import type L from 'leaflet';
	import { cssVar } from '$lib/utils/color';
	import { fetchRoute, type LatLng } from '$lib/services/routing';
	import type { WeatherPoint } from '$lib/services/weather';
	import { toaster } from '$lib/stores/toaster';

	let mapContainer: HTMLDivElement;
	let map = $state<L.Map | null>(null);
	let routeLayer = $state<L.Polyline | null>(null);
	let originMarker = $state<L.CircleMarker | null>(null);
	let destinationMarker = $state<L.CircleMarker | null>(null);
	let weatherMarkers = $state<L.Marker[]>([]);

	let leaflet: typeof L;

	onMount(() => {
		(async () => {
			leaflet = (await import('leaflet')).default;
			await import('leaflet/dist/leaflet.css');

			map = leaflet.map(mapContainer).setView([-14.235, -51.9253], 6);

			leaflet
				.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
					attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
				})
				.addTo(map);

			setTimeout(() => map?.invalidateSize(), 0);

			navigator.geolocation.getCurrentPosition(
				(pos) => {
					const coords: LatLng = [pos.coords.latitude, pos.coords.longitude];
					map?.setView(coords, 13);
					leaflet
						.circleMarker(coords, {
							radius: 8,
							color: cssVar('--color-ride-location-700'),
							fillColor: cssVar('--color-ride-location-500'),
							fillOpacity: 0.9
						})
						.addTo(map!)
						.bindPopup('Você está aqui');
				},
				() => {
					toaster.warning({ title: 'Localização indisponível', description: 'Não foi possível detectar sua posição.' });
				},
				{ enableHighAccuracy: true, timeout: 10000 }
			);
		})();

		return () => {
			map?.remove();
		};
	});

	function clearRoute() {
		map?.off('zoomend', updateWeatherVisibility);
		routeLayer?.remove();
		routeLayer = null;
		originMarker?.remove();
		originMarker = null;
		destinationMarker?.remove();
		destinationMarker = null;
		weatherMarkers.forEach((m) => m.remove());
		weatherMarkers = [];
	}

	export async function drawRoute(originCoords: LatLng, destCoords: LatLng): Promise<LatLng[]> {
		if (!map || !leaflet) return [];

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

		const routeCoords = await fetchRoute(originCoords, destCoords);
		if (routeCoords.length === 0) return [];

		routeLayer = leaflet
			.polyline(routeCoords, { color: cssVar('--color-ride-route-500'), weight: 5, opacity: 0.8 })
			.addTo(map);

		map.fitBounds(routeLayer.getBounds(), { padding: [40, 40] });
		return routeCoords;
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

<div bind:this={mapContainer} class="h-full w-full rounded-lg" style="min-height: 100%;"></div>

<style>
	:global(.leaflet-div-icon-weather) {
		background: none !important;
		border: none !important;
	}
</style>
