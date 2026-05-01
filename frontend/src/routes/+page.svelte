<script lang="ts">
	import { goto } from '$app/navigation';
	import { X, Compass } from 'lucide-svelte';
	import Map from '$lib/components/Map.svelte';
	import RouteWeather from '$lib/components/RouteWeather.svelte';
	import SearchInput from '$lib/components/SearchInput.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import MobileSearch from '$lib/components/MobileSearch.svelte';
	import ProfilePanel from '$lib/components/ProfilePanel.svelte';
	import RouteHistory from '$lib/components/RouteHistory.svelte';
	import ExplorePanel from '$lib/components/ExplorePanel.svelte';
	import { analyzeRoute, type RouteAlert } from '$lib/services/alerts';
	import type { LatLng } from '$lib/services/routing';
	import { calculateRouteScore, type RouteScore, type RidingPreference } from '$lib/services/routeScore';
	import { fetchRouteWeather, type WeatherPoint } from '$lib/services/weather';
	import { createRoute, type ExploreRoute } from '$lib/services/routes';
	import { toaster } from '$lib/stores/toaster';
	import { useMobile } from '$lib/stores/mobile.svelte';
	import { useAuth } from '$lib/stores/auth.svelte';

	const mobile = useMobile();
	const auth = useAuth();

	$effect(() => {
		if (!auth.loading && !auth.isLoggedIn) goto('/login');
	});

	let originCoords = $state<LatLng | null>(null);
	let destCoords = $state<LatLng | null>(null);
	let originLabel = $state('');
	let destLabel = $state('');
	let mapRef = $state<ReturnType<typeof Map>>();
	let weatherPoints = $state<WeatherPoint[]>([]);
	let weatherLoading = $state(false);
	let alerts = $state<RouteAlert[]>([]);
	let score = $state<RouteScore | null>(null);

	let canSearch = $derived(!!originCoords && !!destCoords);
	let desktopProfileOpen = $state(false);
	let historyOpen = $state(false);
	let exploreOpen = $state(false);
	let saving = $state(false);
	let routeSaved = $state(false);

	function openHistory() {
		historyOpen = true;
		exploreOpen = false;
		desktopProfileOpen = false;
		if (mobile.isMobile) mobile.setTab('map');
	}

	async function handleSelectExploreRoute(route: ExploreRoute) {
		if (!mapRef) return;
		exploreOpen = false;

		const origin: LatLng = [route.origin_coords[1], route.origin_coords[0]];
		const dest: LatLng = [route.destination_coords[1], route.destination_coords[0]];
		originCoords = origin;
		destCoords = dest;
		originLabel = route.origin_name;
		destLabel = route.destination_name;

		weatherPoints = [];
		alerts = [];
		score = null;
		routeSaved = false;

		const routeData = await mapRef.drawRoute(origin, dest);
		if (!routeData) {
			toaster.error({ title: 'Rota indisponível', description: 'Não foi possível traçar a rota.' });
			return;
		}

		weatherLoading = true;
		if (mobile.isMobile) mobile.setTab('map');
		try {
			weatherPoints = await fetchRouteWeather(routeData, { origin: originLabel, destination: destLabel });
			if (weatherPoints.length > 0) {
				mapRef.showWeatherMarkers(weatherPoints);
				mapRef.showRouteConditions(routeData.coords, weatherPoints);
				alerts = analyzeRoute(weatherPoints);
				score = calculateRouteScore(weatherPoints, (auth.user?.riding_preference ?? 'mixed') as RidingPreference);
				if (mobile.isMobile) mobile.setTab('weather');
			}
		} catch {
			toaster.error({ title: 'Erro ao buscar clima', description: 'Falha na comunicação com o serviço de clima.' });
		} finally {
			weatherLoading = false;
		}
	}

	async function handleSaveRoute() {
		if (!originCoords || !destCoords || !score) return;
		saving = true;
		try {
			await createRoute({
				name: `${originLabel} → ${destLabel}`,
				origin_name: originLabel,
				destination_name: destLabel,
				origin_coords: [originCoords[1], originCoords[0]],
				destination_coords: [destCoords[1], destCoords[0]],
				distance_km: weatherPoints.length > 0 ? weatherPoints[weatherPoints.length - 1].distanceKm : undefined,
				duration_minutes: weatherPoints.length > 0 ? weatherPoints[weatherPoints.length - 1].estimatedMinutes : undefined,
				score: score.value
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

	async function handleSearch() {
		if (!originCoords || !destCoords || !mapRef) return;

		weatherPoints = [];
		alerts = [];
		score = null;
		routeSaved = false;

		if (mobile.isMobile) {
			mobile.setTab('map');
		}

		const routeData = await mapRef.drawRoute(originCoords, destCoords);
		if (!routeData) {
			toaster.error({ title: 'Rota indisponível', description: 'Não foi possível traçar a rota. O serviço pode estar fora do ar.' });
			return;
		}

		weatherLoading = true;
		try {
			weatherPoints = await fetchRouteWeather(routeData, { origin: originLabel, destination: destLabel });
			if (weatherPoints.length === 0) {
				toaster.warning({ title: 'Clima indisponível', description: 'Não foi possível obter dados de clima para esta rota.' });
			} else {
				mapRef.showWeatherMarkers(weatherPoints);
				mapRef.showRouteConditions(routeData.coords, weatherPoints);
				alerts = analyzeRoute(weatherPoints);
				score = calculateRouteScore(weatherPoints, (auth.user?.riding_preference ?? 'mixed') as RidingPreference);
				if (mobile.isMobile) mobile.setTab('weather');
			}
		} catch {
			toaster.error({ title: 'Erro ao buscar clima', description: 'Falha na comunicação com o serviço de clima. Tente novamente.' });
		} finally {
			weatherLoading = false;
		}
	}
</script>

{#if auth.loading || !auth.isLoggedIn}
	<div class="flex h-dvh items-center justify-center bg-surface-900">
		<div class="h-6 w-6 animate-spin rounded-full border-2 border-surface-400 border-t-primary-400"></div>
	</div>
{:else}
<div class="flex h-dvh flex-col {mobile.isMobile ? '' : 'h-screen'}">
	{#if !mobile.isMobile}
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
			{#if auth.user}
				<div class="relative">
					<button
						onclick={() => desktopProfileOpen = !desktopProfileOpen}
						class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
						style="background-color: var(--color-ride-alert-500);"
					>
						{auth.user.name.charAt(0).toUpperCase()}
					</button>
					{#if desktopProfileOpen}
						<div class="absolute right-0 top-10 z-[1000] w-72 overflow-y-auto rounded-xl border border-surface-700 bg-surface-900 p-4 shadow-xl" style="max-height: 80vh;">
							<div class="flex flex-col gap-3">
								<div class="flex items-center gap-3">
									<div class="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white" style="background-color: var(--color-ride-alert-500);">
										{auth.user.name.charAt(0).toUpperCase()}
									</div>
									<div>
										<p class="text-sm font-semibold text-white">{auth.user.name}</p>
										<p class="text-xs text-surface-400">{auth.user.email}</p>
									</div>
								</div>
								<hr class="border-surface-700" />
								<ProfilePanel
									user={auth.user}
									onLogout={() => auth.logout()}
									onUserUpdate={(u) => auth.setUser(u)}
									onViewAllRoutes={openHistory}
									compact
								/>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</header>
	{/if}

	<div class="relative flex min-h-0 flex-1 {mobile.isMobile ? '' : ''}">
		<div class="{mobile.isMobile ? 'absolute inset-0 bottom-[52px]' : 'flex-1'}">
			<Map bind:this={mapRef} controlsVisible={!mobile.isMobile || (mobile.activeTab === 'map' && !historyOpen && !exploreOpen)} />
			{#if !exploreOpen}
				<button
					type="button"
					onclick={() => { exploreOpen = true; historyOpen = false; }}
					class="absolute bottom-4 left-4 z-[500] flex h-11 w-11 items-center justify-center rounded-full shadow-lg"
					style="background-color: var(--color-ride-route-500);"
					title="Explorar rotas próximas"
				>
					<Compass size={22} class="text-white" />
				</button>
			{/if}
		</div>

		{#if !mobile.isMobile}
			{#if exploreOpen}
				<aside class="flex w-80 flex-col gap-2 overflow-y-auto bg-surface-800 p-4">
					<ExplorePanel onSelect={handleSelectExploreRoute} onClose={() => exploreOpen = false} />
				</aside>
			{:else if historyOpen}
				<aside class="flex w-80 flex-col gap-2 overflow-y-auto bg-surface-800 p-4">
					<div class="flex items-center justify-between">
						<h2 class="text-lg font-semibold text-white">Histórico de viagens</h2>
						<button type="button" onclick={() => historyOpen = false} class="text-surface-400 hover:text-surface-200"><X size={18} /></button>
					</div>
					<RouteHistory />
				</aside>
			{:else}
				<RouteWeather points={weatherPoints} loading={weatherLoading} {alerts} {score} onSave={!routeSaved ? handleSaveRoute : undefined} {saving} />
			{/if}
		{/if}

		{#if mobile.isMobile}
			{#if weatherLoading && mobile.activeTab === 'map'}
				<div class="absolute inset-x-0 top-4 z-[600] flex justify-center">
					<div class="flex items-center gap-2 rounded-full bg-surface-900/90 px-4 py-2 shadow-lg backdrop-blur-sm">
						<div class="h-4 w-4 animate-spin rounded-full border-2 border-surface-400 border-t-primary-400"></div>
						<span class="text-sm text-surface-300">Buscando clima…</span>
					</div>
				</div>
			{/if}

			{#if mobile.activeTab === 'weather'}
				<div class="absolute inset-0 bottom-[52px] z-[500] overflow-y-auto bg-surface-800">
					<RouteWeather points={weatherPoints} loading={weatherLoading} {alerts} {score} mobile onSave={!routeSaved ? handleSaveRoute : undefined} {saving} />
				</div>
			{/if}

			{#if mobile.activeTab === 'profile' && auth.user}
				<div class="absolute inset-0 bottom-[52px] z-[500]">
					<ProfilePanel
						user={auth.user}
						onLogout={() => auth.logout()}
						onUserUpdate={(u) => auth.setUser(u)}
						onViewAllRoutes={openHistory}
					/>
				</div>
			{/if}

			{#if historyOpen}
				<div class="absolute inset-0 bottom-[52px] z-[600] flex flex-col overflow-y-auto bg-surface-800 p-4">
					<div class="flex items-center justify-between pb-3">
						<h2 class="text-lg font-semibold text-white">Histórico de viagens</h2>
						<button type="button" onclick={() => historyOpen = false} class="text-surface-400 hover:text-surface-200"><X size={18} /></button>
					</div>
					<RouteHistory />
				</div>
			{/if}

			{#if exploreOpen}
				<div class="absolute inset-0 bottom-[52px] z-[600] flex flex-col overflow-y-auto bg-surface-800 p-4">
					<ExplorePanel onSelect={handleSelectExploreRoute} onClose={() => exploreOpen = false} />
				</div>
			{/if}

			{#if mobile.searchOpen}
				<MobileSearch
					{canSearch}
					loading={weatherLoading}
					onOriginSelect={(label, coords) => { originLabel = label; originCoords = coords; }}
					onDestSelect={(label, coords) => { destLabel = label; destCoords = coords; }}
					onSearch={handleSearch}
					onClose={() => mobile.toggleSearch()}
				/>
			{/if}

			<BottomNav
				activeTab={mobile.activeTab}
				searchOpen={mobile.searchOpen}
				onTabChange={(tab) => { exploreOpen = false; historyOpen = false; mobile.setTab(tab); }}
				onSearchToggle={() => mobile.toggleSearch()}
				hasWeather={weatherPoints.length > 0}
			/>
		{/if}
	</div>
</div>
{/if}
