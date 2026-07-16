import type Map from '$lib/components/Map.svelte';
import type { RouteStopEntry } from '$lib/types/routeStop';
import { analyzeRoute, type RouteAlert } from '$lib/services/alerts';
import { fetchRoute, type LatLng, type RouteData } from '$lib/services/routing';
import { calculateRouteScore, type RouteScore, type RidingPreference } from '$lib/services/routeScore';
import { fetchRouteWeather, type WeatherPoint } from '$lib/services/weather';
import { createRoute, updateRoute, toStopEntries, type ExploreRoute, type SavedRoute } from '$lib/services/routes';
import { findFuelStops } from '$lib/services/fuelStops';
import { savePack, loadPack, WEATHER_TTL_MS } from '$lib/services/offlinePack';
import { prefetchRouteTiles } from '$lib/services/offlineTiles';
import { closestRouteIndex, haversineM } from '$lib/utils/mapHelpers';
import { getLastPosition } from '$lib/services/geolocation';
import { toaster } from '$lib/stores/toaster';
import { useMobile } from '$lib/stores/mobile.svelte';
import { useAuth } from '$lib/stores/auth.svelte';
import { useSettings } from '$lib/stores/settings.svelte';

export interface ApproachRoute {
	coords: LatLng[];
	distanceKm: number;
	durationMinutes: number;
}

const APPROACH_MIN_M = 200;

export function useRouteSearch() {
	const mobile = useMobile();
	const auth = useAuth();
	const settings = useSettings();

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
	let approachRoute = $state<ApproachRoute | null>(null);
	let exploreRouteId = $state<number | null>(null);
	let editingRouteId = $state<number | null>(null);
	let weatherSavedAt = $state<number | null>(null);
	let approachEntry = $state<LatLng | null>(null);
	let downloadingTiles = $state(false);
	let tileProgress = $state(0);

	let canSearch = $derived(!!originCoords && !!destCoords);
	let hasRoute = $derived(weatherPoints.length > 0);
	let weatherStale = $derived(weatherSavedAt !== null && Date.now() - weatherSavedAt > WEATHER_TTL_MS);

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
		approachRoute = null;
		approachEntry = null;
		weatherSavedAt = null;
	}

	function persistPack(routeData: RouteData) {
		if (!originCoords || !destCoords) return;
		savePack({
			originLabel,
			destLabel,
			originCoords: $state.snapshot(originCoords),
			destCoords: $state.snapshot(destCoords),
			stops: $state.snapshot(stops),
			routeData,
			weatherPoints: $state.snapshot(weatherPoints),
			editingRouteId,
			exploreRouteId,
			savedAt: Date.now()
		});
	}

	async function computeApproach(routeOrigin: LatLng): Promise<void> {
		const pos = getLastPosition();
		if (!pos) return;
		const dlat = pos[0] - routeOrigin[0];
		const dlon = pos[1] - routeOrigin[1];
		const approxM = Math.sqrt(dlat * dlat + dlon * dlon) * 111_320;
		if (approxM < APPROACH_MIN_M) return;

		const data = await fetchRoute(pos, routeOrigin);
		if (!data) return;
		approachRoute = {
			coords: data.coords,
			distanceKm: Math.round(data.totalDistance / 100) / 10,
			durationMinutes: Math.round(data.totalDuration / 60)
		};
		mapRef?.drawApproachRoute(data.coords);
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
			weatherSavedAt = Date.now();
			persistPack(routeData);
			if (settings.autoOfflineMaps) downloadOfflineTiles(false);
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
		editingRouteId = null;
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

	async function suggestFuelStops(intervalKm: number) {
		if (routeCoords.length < 2) return;

		const { stops: fuelStops, missedPoints } = await findFuelStops(routeCoords, intervalKm, stops);
		if (fuelStops.length === 0) {
			if (missedPoints === 0) {
				toaster.info({
					title: 'Rota já coberta',
					description: `As paradas atuais já cobrem o trajeto a cada ${intervalKm} km.`
				});
			} else {
				toaster.warning({
					title: 'Nenhum posto encontrado',
					description: 'Não há postos de combustível próximos aos pontos de abastecimento da rota.'
				});
			}
			return;
		}

		const merged = [...stops, ...fuelStops];
		merged.sort((a, b) => closestRouteIndex(routeCoords, a.coords) - closestRouteIndex(routeCoords, b.coords));
		stops = merged;

		toaster.success({
			title: 'Paradas de abastecimento',
			description: missedPoints > 0
				? `${fuelStops.length} posto(s) adicionado(s). ${missedPoints} ponto(s) sem posto por perto.`
				: `${fuelStops.length} posto(s) adicionado(s) ao trajeto.`
		});
		await executeRoute(true);
	}

	function clearCurrentRoute() {
		resetWeather();
		stops = [];
		originCoords = null;
		destCoords = null;
		originLabel = '';
		destLabel = '';
		exploreRouteId = null;
		editingRouteId = null;
		mapRef?.clearApproachRoute();
	}

	async function loadSavedRoute(saved: SavedRoute): Promise<RouteData | null> {
		if (!mapRef) return null;

		const origin: LatLng = [saved.origin_coords[1], saved.origin_coords[0]];
		const dest: LatLng = [saved.destination_coords[1], saved.destination_coords[0]];
		originCoords = origin;
		destCoords = dest;
		originLabel = saved.origin_name;
		destLabel = saved.destination_name;
		stops = toStopEntries(saved.stops);
		resetWeather();

		const routeData = await mapRef.drawRoute(origin, dest, stops.map((s) => s.coords));
		if (!routeData) {
			toaster.error({ title: 'Rota indisponível', description: 'Não foi possível traçar a rota.' });
			return null;
		}
		if (stops.length > 0) mapRef.showStopMarkers(stops);
		return routeData;
	}

	async function handleSelectExploreRoute(route: ExploreRoute) {
		exploreRouteId = route.id;
		editingRouteId = null;
		const routeData = await loadSavedRoute(route);
		if (!routeData || !originCoords) return;
		await computeApproach(originCoords);
		if (mobile.isMobile) mobile.setTab('map');
		await processWeather(routeData);
	}

	async function handleSelectSavedRoute(saved: SavedRoute) {
		editingRouteId = saved.id;
		exploreRouteId = null;
		const routeData = await loadSavedRoute(saved);
		if (!routeData) return;
		if (mobile.isMobile) mobile.setTab('weather');
		await processWeather(routeData);
	}

	async function restoreOfflinePack(): Promise<boolean> {
		if (!mapRef) return false;
		const pack = await loadPack();
		if (!pack) return false;

		originCoords = pack.originCoords;
		destCoords = pack.destCoords;
		originLabel = pack.originLabel;
		destLabel = pack.destLabel;
		stops = pack.stops;
		editingRouteId = pack.editingRouteId;
		exploreRouteId = pack.exploreRouteId;

		await mapRef.drawStoredRoute(pack.originCoords, pack.destCoords, pack.routeData);
		if (pack.stops.length > 0) mapRef.showStopMarkers(pack.stops);

		weatherPoints = pack.weatherPoints;
		routeCoords = pack.routeData.coords;
		mapRef.showWeatherMarkers(pack.weatherPoints);
		mapRef.showRouteConditions(pack.routeData.coords, pack.weatherPoints);
		alerts = analyzeRoute(pack.weatherPoints);
		score = calculateRouteScore(pack.weatherPoints, (auth.user?.riding_preference ?? 'mixed') as RidingPreference);
		weatherSavedAt = pack.savedAt;
		routeSaved = true;
		drawStraightApproach(pack.routeData.coords);
		return true;
	}

	function drawStraightApproach(coords: LatLng[]) {
		const pos = getLastPosition();
		if (!pos || !mapRef || coords.length === 0) return;
		const entry = coords[closestRouteIndex(coords, pos)];
		const distM = haversineM(pos, entry);
		if (distM < APPROACH_MIN_M) return;
		approachEntry = entry;
		approachRoute = {
			coords: [pos, entry],
			distanceKm: Math.round(distM / 100) / 10,
			durationMinutes: Math.round((distM / 1000 / 40) * 60)
		};
		mapRef.drawApproachRoute([pos, entry]);
	}

	async function downloadOfflineTiles(notify: boolean = true) {
		if (routeCoords.length < 2 || downloadingTiles) return;
		downloadingTiles = true;
		tileProgress = 0;
		try {
			const result = await prefetchRouteTiles($state.snapshot(routeCoords), (done, total) => {
				tileProgress = Math.round((done / total) * 100);
			});
			if (result.failed > 0) {
				toaster.warning({
					title: 'Mapa offline incompleto',
					description: `${result.failed} de ${result.total} blocos falharam. Tente novamente com conexão estável.`
				});
			} else if (notify) {
				toaster.success({
					title: 'Mapa offline pronto',
					description: 'O mapa ao longo da rota foi salvo no aparelho.'
				});
			}
		} catch {
			if (notify) {
				toaster.error({ title: 'Falha no download', description: 'Não foi possível baixar o mapa da rota.' });
			}
		} finally {
			downloadingTiles = false;
		}
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

			const routeParams = {
				name: `${originLabel} → ${destLabel}`,
				origin_name: originLabel,
				destination_name: destLabel,
				origin_coords: [originCoords[1], originCoords[0]] as [number, number],
				destination_coords: [destCoords[1], destCoords[0]] as [number, number],
				distance_km: weatherPoints.length > 0 ? weatherPoints[weatherPoints.length - 1].distanceKm : undefined,
				duration_minutes: weatherPoints.length > 0 ? weatherPoints[weatherPoints.length - 1].estimatedMinutes : undefined,
				score: score.value,
				route_stops_attributes: stopsAttributes
			};

			if (editingRouteId) {
				await updateRoute(editingRouteId, routeParams);
				routeSaved = true;
				toaster.success({ title: 'Rota atualizada', description: 'As alterações foram salvas no histórico.' });
			} else {
				await createRoute(routeParams);
				routeSaved = true;
				toaster.success({ title: 'Rota salva', description: 'A rota foi adicionada ao seu histórico.' });
			}
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
		get approachRoute() { return approachRoute; },
		get exploreRouteId() { return exploreRouteId; },
		get editingRouteId() { return editingRouteId; },
		get weatherStale() { return weatherStale; },
		get approachEntry() { return approachEntry; },
		get downloadingTiles() { return downloadingTiles; },
		get tileProgress() { return tileProgress; },
		downloadOfflineTiles,
		restoreOfflinePack,
		handleSearch,
		addStop,
		removeStop,
		suggestFuelStops,
		clearCurrentRoute,
		handleSelectExploreRoute,
		handleSelectSavedRoute,
		handleSaveRoute
	};
}
