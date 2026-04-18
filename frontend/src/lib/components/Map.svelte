<script lang="ts">
	import { onMount } from 'svelte';
	import type L from 'leaflet';
	import { cssVar } from '$lib/utils/color';
	import { fetchRoute, type LatLng } from '$lib/services/routing';

	let mapContainer: HTMLDivElement;
	let map = $state<L.Map | null>(null);
	let routeLayer = $state<L.Polyline | null>(null);
	let originMarker = $state<L.Marker | null>(null);
	let destinationMarker = $state<L.Marker | null>(null);

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
				() => {}
			);
		})();

		return () => {
			map?.remove();
		};
	});

	function clearRoute() {
		routeLayer?.remove();
		routeLayer = null;
		originMarker?.remove();
		originMarker = null;
		destinationMarker?.remove();
		destinationMarker = null;
	}

	export async function drawRoute(originCoords: LatLng, destCoords: LatLng) {
		if (!map || !leaflet) return;

		clearRoute();

		originMarker = leaflet.marker(originCoords).addTo(map).bindPopup('Origem');
		destinationMarker = leaflet.marker(destCoords).addTo(map).bindPopup('Destino');

		const routeCoords = await fetchRoute(originCoords, destCoords);
		if (routeCoords.length === 0) return;

		routeLayer = leaflet
			.polyline(routeCoords, { color: cssVar('--color-ride-route-500'), weight: 5, opacity: 0.8 })
			.addTo(map);

		map.fitBounds(routeLayer.getBounds(), { padding: [40, 40] });
	}
</script>

<div bind:this={mapContainer} class="h-full w-full rounded-lg" style="min-height: 100%;"></div>
