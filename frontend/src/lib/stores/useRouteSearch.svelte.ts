import type Map from '$lib/components/Map.svelte';
import type { RouteStopEntry } from '$lib/components/RouteStops.svelte';
import { analyzeRoute, type RouteAlert } from '$lib/services/alerts';
import type { LatLng, RouteData } from '$lib/services/routing';
import { calculateRouteScore, type RouteScore, type RidingPreference } from '$lib/services/routeScore';
import { fetchRouteWeather, type WeatherPoint } from '$lib/services/weather';
import { createRoute, type ExploreRoute } from '$lib/services/routes';
import { toaster } from '$lib/stores/toaster';
import { useMobile } from '$lib/stores/mobile.svelte';
import { useAuth } from '$lib/stores/auth.svelte';

export function useRouteSearch() {
	const mobile = useMobile();
	const auth = useAuth();

	let originCoords = $state<LatLng | null>(null);
	let destCoords = $state<LatLng | null>(null);
	let originLabel = $state('');
	let destLabel = $state('');
	let mapRef = $state<ReturnType<typeof Map>>();
	let weatherPoints = $state<WeatherPoint[]>([]);
	let weatherLoading = $state(false);
	let recalculating = $state(false);
	let alerts = $state<RouteAlert[]>([]);
	let score = $state<RouteScore | null>(null);
	let saving = $state(false);
	let routeSaved = $state(false);
	let stops = $state<RouteStopEntry[]>([]);
	let routeCoords = $state<LatLng[]>([]);

	let canSearch = $derived(!!originCoords && !!destCoords);
	let hasRoute = $derived(weatherPoints.length > 0);

	$effect(() => {
		const pref = auth.user?.riding_preference;
		if (weatherPoints.length > 0 && pref) {
			score = calculateRouteScore(weatherPoints, pref as RidingPreference);
		}
	});

	function resetWeather() {
		weatherPoints = [];
		routeCoords = [];
		alerts = [];
		score = null;
		routeSaved = false;
	}

	async function processWeather(routeData: RouteData) {
		weatherLoading = true;
		try {
			const weatherStops = stops.map((s) => ({ coords: s.coords, stopType: s.stopType, name: s.name }));
			const newPoints = await fetchRouteWeather(routeData, { origin: originLabel, destination: destLabel }, weatherStops);
			if (newPoints.length === 0) {
				toaster.warning({ title: 'Clima indisponível', description: 'Não foi possível obter dados de clima para esta rota.' });
				return;
			}
			weatherPoints = newPoints;
			routeCoords = routeData.coords;
			mapRef?.showWeatherMarkers(weatherPoints);
			mapRef?.showRouteConditions(routeData.coords, weatherPoints);
			alerts = analyzeRoute(weatherPoints);
			score = calculateRouteScore(weatherPoints, (auth.user?.riding_preference ?? 'mixed') as RidingPreference);
			routeSaved = false;
		} catch {
			toaster.error({ title: 'Erro ao buscar clima', description: 'Falha na comunicação com o serviço de clima.' });
		} finally {
			weatherLoading = false;
		}
	}

	async function executeRoute(isRecalc = false) {
		if (!originCoords || !destCoords || !mapRef) return;
		if (isRecalc) recalculating = true;

		try {
			const waypoints = stops.map((s) => s.coords);
			const routeData = await mapRef.drawRoute(originCoords, destCoords, waypoints);
			if (!routeData) {
				toaster.error({ title: 'Rota indisponível', description: 'Não foi possível traçar a rota.' });
				return;
			}

			const distanceKm = routeData.totalDistance / 1000;
			if (distanceKm < 5) {
				toaster.warning({ title: 'Rota muito curta', description: 'A rota precisa ter no mínimo 5 km para análise de clima.' });
				return;
			}
			if (distanceKm > 1000) {
				toaster.warning({ title: 'Rota muito longa', description: 'A rota não pode ultrapassar 1.000 km.' });
				return;
			}

			if (stops.length > 0) mapRef.showStopMarkers(stops);
			await processWeather(routeData);
		} finally {
			if (isRecalc) recalculating = false;
		}
	}

	async function handleSearch() {
		if (!originCoords || !destCoords || !mapRef) return;
		stops = [];
		resetWeather();
		if (mobile.isMobile) mobile.setTab('weather');
		await executeRoute();
	}

	function addStop(stop: RouteStopEntry) {
		stops = [...stops, stop];
		executeRoute(true);
	}

	function removeStop(index: number) {
		stops = stops.filter((_, i) => i !== index);
		executeRoute(true);
	}

	function clearCurrentRoute() {
		resetWeather();
		stops = [];
		originCoords = null;
		destCoords = null;
		originLabel = '';
		destLabel = '';
	}

	async function handleSelectExploreRoute(route: ExploreRoute) {
		if (!mapRef) return;

		const origin: LatLng = [route.origin_coords[1], route.origin_coords[0]];
		const dest: LatLng = [route.destination_coords[1], route.destination_coords[0]];
		originCoords = origin;
		destCoords = dest;
		originLabel = route.origin_name;
		destLabel = route.destination_name;
		stops = [];
		resetWeather();

		const routeData = await mapRef.drawRoute(origin, dest);
		if (!routeData) {
			toaster.error({ title: 'Rota indisponível', description: 'Não foi possível traçar a rota.' });
			return;
		}
		if (mobile.isMobile) mobile.setTab('map');
		await processWeather(routeData);
	}

	async function handleSaveRoute() {
		if (!originCoords || !destCoords || !score) return;
		saving = true;
		try {
			const stopsAttributes = stops.map((s, i) => ({
				name: s.name,
				stop_type: s.stopType,
				sort_order: i,
				position: [s.coords[1], s.coords[0]] as [number, number]
			}));

			await createRoute({
				name: `${originLabel} → ${destLabel}`,
				origin_name: originLabel,
				destination_name: destLabel,
				origin_coords: [originCoords[1], originCoords[0]],
				destination_coords: [destCoords[1], destCoords[0]],
				distance_km: weatherPoints.length > 0 ? weatherPoints[weatherPoints.length - 1].distanceKm : undefined,
				duration_minutes: weatherPoints.length > 0 ? weatherPoints[weatherPoints.length - 1].estimatedMinutes : undefined,
				score: score.value,
				route_stops_attributes: stopsAttributes
			});
			routeSaved = true;
			toaster.success({ title: 'Rota salva', description: 'A rota foi adicionada ao seu histórico.' });
		} catch (err) {
			const msg = err instanceof Error ? err.message : '';
			if (msg.includes('já existe')) {
				routeSaved = true;
				toaster.warning({ title: 'Rota duplicada', description: 'Essa rota já está no seu histórico.' });
			} else {
				toaster.error({ title: 'Erro ao salvar', description: 'Não foi possível salvar a rota.' });
			}
		} finally {
			saving = false;
		}
	}

	return {
		get originCoords() { return originCoords; },
		set originCoords(v: LatLng | null) { originCoords = v; },
		get destCoords() { return destCoords; },
		set destCoords(v: LatLng | null) { destCoords = v; },
		get originLabel() { return originLabel; },
		set originLabel(v: string) { originLabel = v; },
		get destLabel() { return destLabel; },
		set destLabel(v: string) { destLabel = v; },
		get mapRef() { return mapRef; },
		set mapRef(v: ReturnType<typeof Map> | undefined) { mapRef = v; },
		get weatherPoints() { return weatherPoints; },
		get weatherLoading() { return weatherLoading; },
		get recalculating() { return recalculating; },
		get alerts() { return alerts; },
		get score() { return score; },
		get saving() { return saving; },
		get routeSaved() { return routeSaved; },
		get canSearch() { return canSearch; },
		get hasRoute() { return hasRoute; },
		get stops() { return stops; },
		get routeCoords() { return routeCoords; },
		handleSearch,
		addStop,
		removeStop,
		clearCurrentRoute,
		handleSelectExploreRoute,
		handleSaveRoute
	};
}
