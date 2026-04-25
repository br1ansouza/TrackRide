<script lang="ts">
	import Map from '$lib/components/Map.svelte';
	import RouteWeather from '$lib/components/RouteWeather.svelte';
	import SearchInput from '$lib/components/SearchInput.svelte';
	import { analyzeRoute, type RouteAlert } from '$lib/services/alerts';
	import type { LatLng } from '$lib/services/routing';
	import { calculateRouteScore, type RouteScore } from '$lib/services/routeScore';
	import { fetchRouteWeather, type WeatherPoint } from '$lib/services/weather';
	import { toaster } from '$lib/stores/toaster';

	let originCoords = $state<LatLng | null>(null);
	let destCoords = $state<LatLng | null>(null);
	let originLabel = $state('');
	let destLabel = $state('');
	let mapRef: ReturnType<typeof Map>;
	let weatherPoints = $state<WeatherPoint[]>([]);
	let weatherLoading = $state(false);
	let alerts = $state<RouteAlert[]>([]);
	let score = $state<RouteScore | null>(null);

	async function handleSearch() {
		if (!originCoords || !destCoords) return;

		weatherPoints = [];
		alerts = [];
		score = null;
		const routeData = await mapRef.drawRoute(originCoords, destCoords);
		if (!routeData) return;

		weatherLoading = true;
		try {
			weatherPoints = await fetchRouteWeather(routeData, { origin: originLabel, destination: destLabel });
			if (weatherPoints.length === 0) {
				toaster.warning({ title: 'Clima indisponível', description: 'Não foi possível obter dados de clima para esta rota.' });
			} else {
				mapRef.showWeatherMarkers(weatherPoints);
				mapRef.showRouteConditions(routeData.coords, weatherPoints);
				alerts = analyzeRoute(weatherPoints);
				score = calculateRouteScore(weatherPoints);
			}
		} catch {
			toaster.error({ title: 'Erro ao buscar clima', description: 'Falha na comunicação com o serviço de clima. Tente novamente.' });
		} finally {
			weatherLoading = false;
		}
	}
</script>

<div class="flex h-screen flex-col">
	<header class="flex items-center gap-4 bg-surface-900 p-4">
		<h1 class="text-xl font-bold text-white">TrackRide</h1>
		<div class="flex flex-1 items-center gap-2">
			<SearchInput
				placeholder="Origem"
				showMyLocation
				onselect={(label, coords) => { originLabel = label; originCoords = coords; }}
			/>
			<SearchInput
				placeholder="Destino"
				onselect={(label, coords) => { destLabel = label; destCoords = coords; }}
			/>
			<button onclick={handleSearch} class="btn preset-filled-primary-500 rounded-md px-4 py-2 text-sm">
				Buscar rota
			</button>
		</div>
	</header>
	<main class="flex min-h-0 flex-1">
		<Map bind:this={mapRef} />
		<RouteWeather points={weatherPoints} loading={weatherLoading} {alerts} {score} />
	</main>
</div>
