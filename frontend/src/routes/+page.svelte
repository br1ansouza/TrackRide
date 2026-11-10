<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { scale, fade, fly } from 'svelte/transition';
	import { transitions } from '#lib/utils/transitions.js';
	import { X, Compass, Play, Maximize2, LocateFixed, WifiOff } from 'lucide-svelte';
	import RideSummary from '#lib/components/RideSummary.svelte';
	import { syncStatus } from '#lib/stores/syncStatus.svelte.js';
	import { idbGet } from '#lib/utils/idb.js';
	import RouteWeather from '#lib/components/RouteWeather.svelte';
	import TrackingOverlay from '#lib/components/TrackingOverlay.svelte';
	import BottomNav from '#lib/components/BottomNav.svelte';
	import MobileSearch from '#lib/components/MobileSearch.svelte';
	import DesktopHeader from '#lib/components/DesktopHeader.svelte';
	import LocationDisclosure from '#lib/components/LocationDisclosure.svelte';
	import { useMobile } from '#lib/stores/mobile.svelte.js';
	import { useAuth } from '#lib/stores/auth.svelte.js';
	import { useConnectivity } from '#lib/stores/connectivity.svelte.js';
	import { useRouteSearch } from '#lib/stores/useRouteSearch.svelte.js';
	import { useTracking } from '#lib/stores/useTracking.svelte.js';
	import { type CreateRouteParams } from '#lib/services/routes.js';
	import { enqueueRide, flushRides, refreshPendingCount } from '#lib/services/syncQueue.js';
	import type { LatLng } from '#lib/services/routing.js';
	import { safeTop, safeBottom, safeBottomNav, safeLeft, safeRight } from '#lib/utils/safeArea.js';
	import { bearingAlongPath, haversineM, closestRouteIndex } from '#lib/utils/mapHelpers.js';
	import { vibrateHeavy } from '#lib/utils/haptics.js';
	import { toaster } from '#lib/stores/toaster.js';
	import { isStandaloneBuild } from '#lib/utils/platform.js';

	const mobile = useMobile();
	const auth = useAuth();
	const connectivity = useConnectivity();
	const route = useRouteSearch();
	const tracking = useTracking();

	$effect(() => {
		if (!auth.loading && !auth.isLoggedIn) goto('/login');
	});

	onMount(() => {
		void refreshPendingCount().catch(() => {});
		const interval = setInterval(() => {
			if (auth.isLoggedIn && connectivity.serverReady) void syncPendingRides();
		}, 15000);
		return () => clearInterval(interval);
	});
	$effect(() => {
		if (auth.isLoggedIn && connectivity.serverReady) void syncPendingRides();
	});

	let offlineRestoreAttempted = false;
	let wasOffline = false;

	$effect(() => {
		if (offlineRestoreAttempted || connectivity.online) return;
		if (auth.loading || !auth.isLoggedIn || !route.mapRef || route.hasRoute) return;
		offlineRestoreAttempted = true;
		route.restoreOfflinePack().then((restored) => {
			if (restored) {
				toaster.info({
					title: 'Modo offline',
					description: route.weatherStale
						? 'Rota carregada do pacote salvo. O clima está desatualizado.'
						: 'Rota carregada do pacote salvo.'
				});
			}
		});
	});

	$effect(() => {
		if (!connectivity.online) {
			wasOffline = true;
			return;
		}
		if (wasOffline) {
			wasOffline = false;
			route.mapRef?.reloadBaseTiles();
			syncPendingRides();
		}
	});

	async function syncPendingRides() {
		if (!auth.isLoggedIn || !connectivity.serverReady) return;
		const synced = await flushRides();
		const currentSummary = summary;
		if (currentSummary && summaryStatus === 'local') {
			const pending = await idbGet('sync-queue', currentSummary.client_id!).catch(() => true);
			if (!pending && summary === currentSummary) summaryStatus = 'synced';
		}
		if (synced > 0 && !summary)
			toaster.success({
				title: 'Percursos sincronizados',
				description: `${synced} percurso(s) enviado(s) ao histórico.`
			});
	}
	let summary = $state<CreateRouteParams | null>(null);
	let summaryStatus = $state<'saving' | 'local' | 'synced' | 'failed'>('saving');
	let summaryExploreId: number | null = null;
	async function saveSummary() {
		if (!summary) return;
		summaryStatus = 'saving';
		try {
			await enqueueRide($state.snapshot(summary), summaryExploreId);
			summaryStatus = 'local';
			void syncPendingRides();
		} catch {
			summaryStatus = 'failed';
		}
	}

	let following = $state(true);

	const MOVEMENT_BEARING_MIN_M = 10;
	const ARRIVAL_RADIUS_M = 120;

	function routeAheadBearing(position: LatLng): number | undefined {
		const path =
			tracking.inApproach && route.approachRoute
				? route.approachRoute.coords
				: tracking.plannedRoute.length >= 2
					? tracking.plannedRoute
					: route.routeCoords;
		return bearingAlongPath(path, position) ?? undefined;
	}

	function navigationBearing(current: LatLng, prev?: LatLng): number | undefined {
		if (prev && haversineM(prev, current) >= MOVEMENT_BEARING_MIN_M) return undefined;
		return routeAheadBearing(current);
	}

	$effect(() => {
		route.mapRef?.setNavigating(tracking.active);
	});

	$effect(() => {
		if (tracking.active && tracking.displayPath.length >= 2) {
			route.mapRef?.drawTrackedPath(tracking.displayPath);
			const path = tracking.displayPath;
			const current = path[path.length - 1];
			const prev = path[path.length - 2];
			if (!following) {
				route.mapRef?.updateUserPosition(current, navigationBearing(current, prev));
				return;
			}
			route.mapRef?.followPosition(
				current,
				prev,
				navigationBearing(current, prev),
				tracking.speedKmh
			);
		} else if (tracking.active && following && tracking.currentPosition) {
			const current = tracking.snappedPosition ?? tracking.currentPosition;
			route.mapRef?.followPosition(
				current,
				undefined,
				routeAheadBearing(current),
				tracking.speedKmh
			);
		}
	});

	function showRouteOverview() {
		following = false;
		route.mapRef?.fitRoute();
	}

	function recenterOnPosition() {
		if (tracking.active) {
			following = true;
			const path = tracking.displayPath;
			if (path.length >= 2) {
				const current = path[path.length - 1];
				const prev = path[path.length - 2];
				route.mapRef?.followPosition(
					current,
					prev,
					navigationBearing(current, prev),
					tracking.speedKmh
				);
			} else if (tracking.currentPosition) {
				const current = tracking.snappedPosition ?? tracking.currentPosition;
				route.mapRef?.followPosition(
					current,
					undefined,
					routeAheadBearing(current),
					tracking.speedKmh
				);
			}
			return;
		}
		route.mapRef?.zoomStreet();
	}

	let desktopProfileOpen = $state(false);
	let historyOpen = $state(false);
	let exploreOpen = $state(false);
	let showLocationDisclosure = $state(false);
	const LOCATION_DISCLOSURE_KEY = 'trackride:background-location-disclosure-v1';

	function openHistory() {
		historyOpen = true;
		exploreOpen = false;
		desktopProfileOpen = false;
		if (mobile.isMobile) mobile.setTab('map');
	}

	function openExplore() {
		exploreOpen = true;
		historyOpen = false;
	}

	async function handleReroute(position: LatLng, bearingDeg: number | null) {
		if (!route.mapRef || !route.destCoords) return;
		toaster.info({ title: 'Recalculando rota', description: 'Você saiu do trajeto planejado.' });
		const planned = tracking.plannedRoute.length >= 2 ? tracking.plannedRoute : route.routeCoords;
		const riderIndex = closestRouteIndex(planned, position);
		const pendingStops = route.stops.filter(
			(s) => closestRouteIndex(planned, s.coords) >= riderIndex
		);
		const routeData = await route.mapRef.drawRoute(
			position,
			route.destCoords,
			pendingStops.map((s) => s.coords),
			true,
			bearingDeg
		);
		if (routeData) {
			tracking.updatePlannedRoute(routeData.coords);
		} else {
			toaster.warning({
				title: 'Fora da rota',
				description: 'Sem conexão para recalcular. Siga em direção ao trajeto planejado.'
			});
		}
	}

	function beginTracking() {
		vibrateHeavy();
		following = true;
		tracking.start({
			plannedRoute: route.routeCoords,
			approachRoute: route.approachRoute?.coords,
			routeOrigin: route.approachEntry ?? route.originCoords ?? undefined,
			onReroute: handleReroute,
			onApproachComplete() {
				route.mapRef?.clearApproachRoute();
			}
		});
		mobile.setTab('map');
		if (tracking.currentPosition) {
			route.mapRef?.followPosition(
				tracking.currentPosition,
				undefined,
				routeAheadBearing(tracking.currentPosition),
				tracking.speedKmh
			);
		}
	}

	function startTracking() {
		if (isStandaloneBuild && localStorage.getItem(LOCATION_DISCLOSURE_KEY) !== 'accepted') {
			showLocationDisclosure = true;
			return;
		}
		beginTracking();
	}

	function acceptLocationDisclosure() {
		localStorage.setItem(LOCATION_DISCLOSURE_KEY, 'accepted');
		showLocationDisclosure = false;
		beginTracking();
	}

	async function stopTracking() {
		vibrateHeavy();
		const result = tracking.stop();
		route.mapRef?.clearTracking();

		if (result.path.length < 2 || result.distanceKm < 0.1) {
			toaster.warning({
				title: 'Percurso muito curto',
				description: 'Nenhum percurso registrado.'
			});
			return;
		}

		const completed = !!(
			result.positionFresh &&
			result.lastPosition &&
			route.destCoords &&
			haversineM(result.lastPosition, route.destCoords) <= ARRIVAL_RADIUS_M
		);

		const rideParams: CreateRouteParams = {
			client_id: crypto.randomUUID(),
			name: `${route.originLabel} → ${route.destLabel}`,
			origin_name: route.originLabel,
			destination_name: route.destLabel,
			origin_coords: [result.path[0][1], result.path[0][0]],
			destination_coords: [
				result.path[result.path.length - 1][1],
				result.path[result.path.length - 1][0]
			],
			path_coords: result.path.flatMap((p) => [p[1], p[0]]),
			distance_km: result.distanceKm,
			duration_minutes: result.durationMinutes,
			score: route.score?.value,
			completed
		};

		summary = rideParams;
		summaryExploreId = route.exploreRouteId;
		await saveSummary();
	}

	let showStartButton = $derived(
		mobile.isMobile &&
			!summary &&
			route.hasRoute &&
			!tracking.active &&
			(mobile.activeTab === 'map' || mobile.activeTab === 'weather') &&
			!mobile.searchOpen &&
			!historyOpen &&
			!exploreOpen
	);
</script>

{#if auth.loading || !auth.isLoggedIn}
	<div class="flex h-dvh items-center justify-center bg-surface-900">
		<p role="status" class="text-sm text-surface-300">Preparando sua sessão…</p>
	</div>
{:else}
	<div class="flex h-dvh flex-col {mobile.isMobile ? '' : 'h-screen'}">
		{#if !mobile.isMobile && auth.user}
			<DesktopHeader
				user={auth.user}
				profileOpen={desktopProfileOpen}
				onOriginSelect={(label, coords) => {
					route.originLabel = label;
					route.originCoords = coords;
				}}
				onDestSelect={(label, coords) => {
					route.destLabel = label;
					route.destCoords = coords;
				}}
				onSearch={route.handleSearch}
				onProfileToggle={() => (desktopProfileOpen = !desktopProfileOpen)}
				onLogout={() => auth.logout()}
				onUserUpdate={(u) => auth.setUser(u)}
				onViewAllRoutes={openHistory}
			/>
		{/if}

		<div class="relative flex min-h-0 flex-1">
			<div
				class={mobile.isMobile ? 'absolute inset-0' : 'flex-1'}
				class:bottom-[52px]={mobile.isMobile && !tracking.active}
			>
				{#await import('#lib/components/Map.svelte')}<p
						class="p-4 text-sm text-surface-300"
						role="status"
					>
						Carregando…
					</p>{:then { default: Map }}
					<Map
						bind:this={route.mapRef}
						controlsVisible={!mobile.isMobile ||
							(mobile.activeTab === 'map' && !historyOpen && !exploreOpen)}
					/>
				{:catch}<p class="p-4 text-sm text-surface-300">
						Não foi possível carregar este painel. Reabra o app para tentar novamente.
					</p>{/await}

				{#if tracking.active}
					<TrackingOverlay
						distanceKm={tracking.distanceKm}
						elapsed={tracking.elapsedFormatted()}
						speedKmh={tracking.speedKmh}
						onStop={stopTracking}
					/>
				{/if}

				{#if route.recalculating}
					<div
						class="pointer-events-none absolute inset-x-0 z-[600] flex justify-center"
						style="top: {safeTop};"
						transition:fade={transitions.quick}
					>
						<div
							class="flex items-center gap-2 rounded-full bg-surface-900/90 px-4 py-2 shadow-lg backdrop-blur-sm"
						>
							<div
								class="h-4 w-4 animate-spin rounded-full border-2 border-surface-400 border-t-primary-400"
							></div>
							<span class="text-sm text-surface-300">Recalculando rota…</span>
						</div>
					</div>
				{/if}

				{#if !connectivity.online}
					<div
						class="pointer-events-none absolute z-[650]"
						style="top: {safeTop}; right: {safeRight};"
						transition:fade={transitions.quick}
					>
						<div
							class="flex h-8 w-8 items-center justify-center rounded-full bg-surface-900/90 shadow-lg backdrop-blur-sm"
							title="Sem conexão"
						>
							<WifiOff size={15} style="color: var(--color-ride-alert-300);" />
						</div>
					</div>
				{/if}

				{#if !exploreOpen && !tracking.active}
					<button
						type="button"
						onclick={openExplore}
						class="absolute z-[500] flex h-11 w-11 items-center justify-center rounded-full shadow-lg"
						style="bottom: {safeBottom}; left: {safeLeft}; background-color: var(--color-ride-route-500);"
						title="Explorar rotas próximas"
					>
						<Compass size={22} class="text-white" />
					</button>
				{/if}
				{#if route.hasRoute || tracking.active}
					<div
						class="absolute z-[500] flex flex-col gap-2"
						style="bottom: {safeBottom}; right: {safeRight};"
					>
						<button
							type="button"
							onclick={showRouteOverview}
							class="flex h-10 w-10 items-center justify-center rounded-full bg-surface-800/90 shadow-lg backdrop-blur-sm"
							title="Ver rota inteira"
						>
							<Maximize2 size={18} class="text-white" />
						</button>
						<button
							type="button"
							onclick={recenterOnPosition}
							class="flex h-10 w-10 items-center justify-center rounded-full bg-surface-800/90 shadow-lg backdrop-blur-sm"
							title="Zoom na sua posição"
						>
							<LocateFixed size={18} class="text-white" />
						</button>
					</div>
				{/if}
			</div>

			{#if !mobile.isMobile}
				{#if exploreOpen}
					<aside class="flex w-80 flex-col gap-2 overflow-y-auto bg-surface-800 p-4">
						{#await import('#lib/components/ExplorePanel.svelte')}<p
								class="p-4 text-sm text-surface-300"
								role="status"
							>
								Carregando…
							</p>{:then { default: ExplorePanel }}
							<ExplorePanel
								onSelect={(r) => {
									exploreOpen = false;
									route.handleSelectExploreRoute(r);
								}}
								onClose={() => (exploreOpen = false)}
							/>
						{:catch}<p class="p-4 text-sm text-surface-300">
								Não foi possível carregar este painel. Reabra o app para tentar novamente.
							</p>{/await}
					</aside>
				{:else if historyOpen}
					<aside class="flex w-80 flex-col gap-2 overflow-y-auto bg-surface-800 p-4">
						<div class="flex items-center justify-between">
							<h2 class="text-lg font-semibold text-white">Histórico de viagens</h2>
							<button
								type="button"
								onclick={() => (historyOpen = false)}
								class="text-surface-400 hover:text-surface-200"><X size={18} /></button
							>
						</div>
						{#await import('#lib/components/RouteHistory.svelte')}<p
								class="p-4 text-sm text-surface-300"
								role="status"
							>
								Carregando…
							</p>{:then { default: RouteHistory }}
							<RouteHistory
								onSelect={(r) => {
									historyOpen = false;
									route.handleSelectSavedRoute(r);
								}}
							/>
						{:catch}<p class="p-4 text-sm text-surface-300">
								Não foi possível carregar este painel. Reabra o app para tentar novamente.
							</p>{/await}
					</aside>
				{:else}
					<RouteWeather
						points={route.weatherPoints}
						loading={route.weatherLoading}
						alerts={route.alerts}
						score={route.score}
						onSave={!route.routeSaved ? route.handleSaveRoute : undefined}
						saving={route.saving}
						editing={route.editingRouteId !== null}
						stops={route.stops}
						onAddStop={route.addStop}
						onRemoveStop={route.removeStop}
						onSuggestFuel={route.suggestFuelStops}
						fuelRangeKm={auth.user?.fuel_range_km ?? null}
						onClear={route.clearCurrentRoute}
						approachRoute={route.approachRoute}
						weatherStale={route.weatherStale}
						onDownloadTiles={connectivity.online ? () => route.downloadOfflineTiles() : undefined}
						downloadingTiles={route.downloadingTiles}
						tileProgress={route.tileProgress}
						tilesDownloaded={route.tilesDownloaded}
					/>
				{/if}
			{/if}

			{#if mobile.isMobile && !tracking.active}
				{#if route.weatherLoading && !route.recalculating && mobile.activeTab === 'map'}
					<div
						class="pointer-events-none absolute inset-x-0 z-[600] flex justify-center"
						style="top: {safeTop};"
						transition:fade={transitions.quick}
					>
						<div
							class="flex items-center gap-2 rounded-full bg-surface-900/90 px-4 py-2 shadow-lg backdrop-blur-sm"
						>
							<div
								class="h-4 w-4 animate-spin rounded-full border-2 border-surface-400 border-t-primary-400"
							></div>
							<span class="text-sm text-surface-300">Buscando clima…</span>
						</div>
					</div>
				{/if}

				{#if mobile.activeTab === 'weather'}
					<div
						class="absolute inset-0 z-[500] overflow-y-auto bg-surface-800"
						style="bottom: calc(52px + env(safe-area-inset-bottom)); padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right)"
						transition:fly={transitions.panel}
					>
						<RouteWeather
							points={route.weatherPoints}
							loading={route.weatherLoading}
							alerts={route.alerts}
							score={route.score}
							mobile
							onSave={!route.routeSaved ? route.handleSaveRoute : undefined}
							saving={route.saving}
							editing={route.editingRouteId !== null}
							stops={route.stops}
							onAddStop={route.addStop}
							onRemoveStop={route.removeStop}
							onSuggestFuel={route.suggestFuelStops}
							fuelRangeKm={auth.user?.fuel_range_km ?? null}
							onClear={route.clearCurrentRoute}
							approachRoute={route.approachRoute}
							weatherStale={route.weatherStale}
							onDownloadTiles={connectivity.online ? () => route.downloadOfflineTiles() : undefined}
							downloadingTiles={route.downloadingTiles}
							tileProgress={route.tileProgress}
							tilesDownloaded={route.tilesDownloaded}
						/>
					</div>
				{/if}

				{#if mobile.activeTab === 'profile' && auth.user}
					<div
						class="absolute inset-0 bottom-[52px] z-[500]"
						style="padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right)"
						transition:fly={transitions.panel}
					>
						{#await import('#lib/components/ProfilePanel.svelte')}<p
								class="p-4 text-sm text-surface-300"
								role="status"
							>
								Carregando…
							</p>{:then { default: ProfilePanel }}
							<ProfilePanel
								user={auth.user}
								onLogout={() => auth.logout()}
								onUserUpdate={(u) => auth.setUser(u)}
								onViewAllRoutes={openHistory}
							/>
						{:catch}<p class="p-4 text-sm text-surface-300">
								Não foi possível carregar este painel. Reabra o app para tentar novamente.
							</p>{/await}
					</div>
				{/if}

				{#if historyOpen}
					<div
						class="absolute inset-0 z-[600] flex flex-col overflow-y-auto bg-surface-800 p-4"
						style="padding-top: {safeTop}; bottom: calc(52px + env(safe-area-inset-bottom)); padding-left: {safeLeft}; padding-right: {safeRight}"
						transition:fly={transitions.panel}
					>
						<div class="flex items-center justify-between pb-3">
							<h2 class="text-lg font-semibold text-white">Histórico de viagens</h2>
							<button
								type="button"
								onclick={() => (historyOpen = false)}
								class="text-surface-400 hover:text-surface-200"><X size={18} /></button
							>
						</div>
						{#await import('#lib/components/RouteHistory.svelte')}<p
								class="p-4 text-sm text-surface-300"
								role="status"
							>
								Carregando…
							</p>{:then { default: RouteHistory }}
							<RouteHistory
								onSelect={(r) => {
									historyOpen = false;
									route.handleSelectSavedRoute(r);
								}}
							/>
						{:catch}<p class="p-4 text-sm text-surface-300">
								Não foi possível carregar este painel. Reabra o app para tentar novamente.
							</p>{/await}
					</div>
				{/if}

				{#if exploreOpen}
					<div
						class="absolute inset-0 z-[600] flex flex-col overflow-y-auto bg-surface-800 p-4"
						style="padding-top: {safeTop}; bottom: calc(52px + env(safe-area-inset-bottom)); padding-left: {safeLeft}; padding-right: {safeRight}"
						transition:fly={transitions.panel}
					>
						{#await import('#lib/components/ExplorePanel.svelte')}<p
								class="p-4 text-sm text-surface-300"
								role="status"
							>
								Carregando…
							</p>{:then { default: ExplorePanel }}
							<ExplorePanel
								onSelect={(r) => {
									exploreOpen = false;
									route.handleSelectExploreRoute(r);
								}}
								onClose={() => (exploreOpen = false)}
							/>
						{:catch}<p class="p-4 text-sm text-surface-300">
								Não foi possível carregar este painel. Reabra o app para tentar novamente.
							</p>{/await}
					</div>
				{/if}

				{#if mobile.searchOpen}
					<MobileSearch
						canSearch={route.canSearch}
						loading={route.weatherLoading}
						onOriginSelect={(label, coords) => {
							route.originLabel = label;
							route.originCoords = coords;
						}}
						onDestSelect={(label, coords) => {
							route.destLabel = label;
							route.destCoords = coords;
						}}
						onSearch={route.handleSearch}
						onClose={() => mobile.toggleSearch()}
					/>
				{/if}

				{#if showStartButton}
					<div
						class="pointer-events-none absolute inset-x-0 z-[800] flex justify-center"
						style="bottom: {safeBottomNav};"
						transition:scale={transitions.button}
					>
						<button
							type="button"
							onclick={startTracking}
							class="pointer-events-auto flex items-center gap-2 rounded-full px-5 py-3 shadow-lg"
							style="background-color: var(--color-ride-alert-500);"
						>
							<Play size={18} class="text-white" fill="white" />
							<span class="text-sm font-semibold text-white">Começar rota</span>
						</button>
					</div>
				{/if}

				<BottomNav
					activeTab={mobile.activeTab}
					searchOpen={mobile.searchOpen}
					onTabChange={(tab) => {
						exploreOpen = false;
						historyOpen = false;
						mobile.setTab(tab);
					}}
					onSearchToggle={() => mobile.toggleSearch()}
					hasWeather={route.weatherPoints.length > 0}
				/>
			{/if}
		</div>
	</div>
{/if}

{#if showLocationDisclosure}
	<LocationDisclosure
		onConfirm={acceptLocationDisclosure}
		onCancel={() => (showLocationDisclosure = false)}
	/>
{/if}

{#if summary}
	<RideSummary
		ride={summary}
		status={summaryStatus}
		onClose={() => (summary = null)}
		onRetry={saveSummary}
	/>
{/if}

{#if auth.isLoggedIn && syncStatus.pending > 0 && !summary && !tracking.active}
	<div
		class="fixed left-4 right-4 z-[850] mx-auto max-w-sm rounded-xl bg-surface-900 p-3 text-center text-xs text-surface-200 shadow-lg"
		style="bottom: calc(128px + env(safe-area-inset-bottom));"
		role="status"
	>
		<span
			>{syncStatus.pending} viagem(ns) salva(s) no aparelho · {syncStatus.syncing
				? 'sincronizando…'
				: 'aguardando envio'}</span
		>
		{#if syncStatus.error}<p class="mt-1">{syncStatus.error}</p>{/if}
		<button
			class="mt-1 block w-full underline"
			disabled={syncStatus.syncing}
			onclick={async () => {
				if (await connectivity.checkNow()) await syncPendingRides();
			}}>Tentar sincronizar</button
		>
	</div>
{/if}
