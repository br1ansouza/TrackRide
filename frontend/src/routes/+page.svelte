<script lang="ts">
	import { goto } from '$app/navigation';
	import { X, Compass, Play, Maximize2, LocateFixed } from 'lucide-svelte';
	import Map from '$lib/components/Map.svelte';
	import RouteWeather from '$lib/components/RouteWeather.svelte';
	import TrackingOverlay from '$lib/components/TrackingOverlay.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import MobileSearch from '$lib/components/MobileSearch.svelte';
	import ProfilePanel from '$lib/components/ProfilePanel.svelte';
	import RouteHistory from '$lib/components/RouteHistory.svelte';
	import ExplorePanel from '$lib/components/ExplorePanel.svelte';
	import DesktopHeader from '$lib/components/DesktopHeader.svelte';
	import { useMobile } from '$lib/stores/mobile.svelte';
	import { useAuth } from '$lib/stores/auth.svelte';
	import { useRouteSearch } from '$lib/stores/useRouteSearch.svelte';
	import { useTracking } from '$lib/stores/useTracking.svelte';
	import { createRoute } from '$lib/services/routes';
	import type { LatLng } from '$lib/services/routing';
	import { toaster } from '$lib/stores/toaster';

	const mobile = useMobile();
	const auth = useAuth();
	const route = useRouteSearch();
	const tracking = useTracking();

	$effect(() => {
		if (!auth.loading && !auth.isLoggedIn) goto('/login');
	});

	$effect(() => {
		if (tracking.active && tracking.trackedPath.length >= 2) {
			route.mapRef?.drawTrackedPath(tracking.trackedPath);
			const path = tracking.trackedPath;
			route.mapRef?.followPosition(path[path.length - 1], path[path.length - 2]);
		} else if (tracking.active && tracking.currentPosition) {
			route.mapRef?.followPosition(tracking.currentPosition);
		}
	});

	let desktopProfileOpen = $state(false);
	let historyOpen = $state(false);
	let exploreOpen = $state(false);

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

	async function handleReroute(position: LatLng) {
		if (!route.mapRef || !route.destCoords) return;
		toaster.info({ title: 'Recalculando rota', description: 'Você saiu do trajeto planejado.' });
		const routeData = await route.mapRef.drawRoute(position, route.destCoords, [], true);
		if (routeData) {
			tracking.updatePlannedRoute(routeData.coords);
		}
	}

	function startTracking() {
		tracking.start({
			plannedRoute: route.routeCoords,
			onReroute: handleReroute
		});
		mobile.setTab('map');
		if (tracking.currentPosition) {
			route.mapRef?.followPosition(tracking.currentPosition);
		}
	}

	async function stopTracking() {
		const result = tracking.stop();
		route.mapRef?.clearTracking();

		if (result.path.length < 2 || result.distanceKm < 0.1) {
			toaster.warning({ title: 'Percurso muito curto', description: 'Nenhum percurso registrado.' });
			return;
		}

		try {
			const pathFlat = result.path.flatMap((p) => [p[1], p[0]]);
			await createRoute({
				name: `${route.originLabel} → ${route.destLabel}`,
				origin_name: route.originLabel,
				destination_name: route.destLabel,
				origin_coords: [route.originCoords![1], route.originCoords![0]],
				destination_coords: [route.destCoords![1], route.destCoords![0]],
				path_coords: pathFlat,
				distance_km: result.distanceKm,
				duration_minutes: result.durationMinutes,
				score: route.score?.value
			});
			toaster.success({ title: 'Percurso salvo', description: `${result.distanceKm} km registrados no histórico.` });
		} catch {
			toaster.error({ title: 'Erro ao salvar', description: 'Não foi possível salvar o percurso.' });
		}
	}

	let showStartButton = $derived(
		mobile.isMobile && route.hasRoute && !tracking.active && (mobile.activeTab === 'map' || mobile.activeTab === 'weather') && !mobile.searchOpen && !historyOpen && !exploreOpen
	);
</script>

{#if auth.loading || !auth.isLoggedIn}
	<div class="flex h-dvh items-center justify-center bg-surface-900">
		<div class="h-6 w-6 animate-spin rounded-full border-2 border-surface-400 border-t-primary-400"></div>
	</div>
{:else}
<div class="flex h-dvh flex-col {mobile.isMobile ? '' : 'h-screen'}">
	{#if !mobile.isMobile && auth.user}
		<DesktopHeader
			user={auth.user}
			profileOpen={desktopProfileOpen}
			onOriginSelect={(label, coords) => { route.originLabel = label; route.originCoords = coords; }}
			onDestSelect={(label, coords) => { route.destLabel = label; route.destCoords = coords; }}
			onSearch={route.handleSearch}
			onProfileToggle={() => desktopProfileOpen = !desktopProfileOpen}
			onLogout={() => auth.logout()}
			onUserUpdate={(u) => auth.setUser(u)}
			onViewAllRoutes={openHistory}
		/>
	{/if}

	<div class="relative flex min-h-0 flex-1">
		<div class="{mobile.isMobile ? 'absolute inset-0' : 'flex-1'}" class:bottom-[52px]={mobile.isMobile && !tracking.active}>
			<Map bind:this={route.mapRef} controlsVisible={!mobile.isMobile || (mobile.activeTab === 'map' && !historyOpen && !exploreOpen)} />

			{#if tracking.active}
				<TrackingOverlay
					distanceKm={tracking.distanceKm}
					elapsed={tracking.elapsedFormatted()}
					speed={tracking.speedFormatted}
					onStop={stopTracking}
				/>
			{/if}

			{#if route.recalculating}
				<div class="absolute inset-x-0 top-4 z-[600] flex justify-center">
					<div class="flex items-center gap-2 rounded-full bg-surface-900/90 px-4 py-2 shadow-lg backdrop-blur-sm">
						<div class="h-4 w-4 animate-spin rounded-full border-2 border-surface-400 border-t-primary-400"></div>
						<span class="text-sm text-surface-300">Recalculando rota…</span>
					</div>
				</div>
			{/if}

			{#if !exploreOpen && !tracking.active}
				<button
					type="button"
					onclick={openExplore}
					class="absolute left-4 z-[500] flex h-11 w-11 items-center justify-center rounded-full shadow-lg"
					style="bottom: calc(16px + env(safe-area-inset-bottom)); background-color: var(--color-ride-route-500);"
					title="Explorar rotas próximas"
				>
					<Compass size={22} class="text-white" />
				</button>
			{/if}
			{#if route.hasRoute || tracking.active}
				<div class="absolute right-4 z-[500] flex flex-col gap-2" style="bottom: calc(16px + env(safe-area-inset-bottom));">
					<button
						type="button"
						onclick={() => route.mapRef?.fitRoute()}
						class="flex h-10 w-10 items-center justify-center rounded-full bg-surface-800/90 shadow-lg backdrop-blur-sm"
						title="Ver rota inteira"
					>
						<Maximize2 size={18} class="text-white" />
					</button>
					<button
						type="button"
						onclick={() => route.mapRef?.zoomStreet()}
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
					<ExplorePanel onSelect={(r) => { exploreOpen = false; route.handleSelectExploreRoute(r); }} onClose={() => exploreOpen = false} />
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
				<RouteWeather points={route.weatherPoints} loading={route.weatherLoading} alerts={route.alerts} score={route.score} onSave={!route.routeSaved ? route.handleSaveRoute : undefined} saving={route.saving} stops={route.stops} onAddStop={route.addStop} onRemoveStop={route.removeStop} onClear={route.clearCurrentRoute} />
			{/if}
		{/if}

		{#if mobile.isMobile && !tracking.active}
			{#if route.weatherLoading && !route.recalculating && mobile.activeTab === 'map'}
				<div class="absolute inset-x-0 top-4 z-[600] flex justify-center">
					<div class="flex items-center gap-2 rounded-full bg-surface-900/90 px-4 py-2 shadow-lg backdrop-blur-sm">
						<div class="h-4 w-4 animate-spin rounded-full border-2 border-surface-400 border-t-primary-400"></div>
						<span class="text-sm text-surface-300">Buscando clima…</span>
					</div>
				</div>
			{/if}

			{#if mobile.activeTab === 'weather'}
				<div class="absolute inset-0 bottom-[52px] z-[500] overflow-y-auto bg-surface-800">
					<RouteWeather points={route.weatherPoints} loading={route.weatherLoading} alerts={route.alerts} score={route.score} mobile onSave={!route.routeSaved ? route.handleSaveRoute : undefined} saving={route.saving} stops={route.stops} onAddStop={route.addStop} onRemoveStop={route.removeStop} onClear={route.clearCurrentRoute} />
				</div>
			{/if}

			{#if mobile.activeTab === 'profile' && auth.user}
				<div class="absolute inset-0 bottom-[52px] z-[500]">
					<ProfilePanel user={auth.user} onLogout={() => auth.logout()} onUserUpdate={(u) => auth.setUser(u)} onViewAllRoutes={openHistory} />
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
					<ExplorePanel onSelect={(r) => { exploreOpen = false; route.handleSelectExploreRoute(r); }} onClose={() => exploreOpen = false} />
				</div>
			{/if}

			{#if mobile.searchOpen}
				<MobileSearch
					canSearch={route.canSearch}
					loading={route.weatherLoading}
					onOriginSelect={(label, coords) => { route.originLabel = label; route.originCoords = coords; }}
					onDestSelect={(label, coords) => { route.destLabel = label; route.destCoords = coords; }}
					onSearch={route.handleSearch}
					onClose={() => mobile.toggleSearch()}
				/>
			{/if}

			{#if showStartButton}
				<div class="absolute inset-x-0 z-[800] flex justify-center" style="bottom: calc(60px + env(safe-area-inset-bottom));">
					<button
						type="button"
						onclick={startTracking}
						class="flex items-center gap-2 rounded-full px-5 py-3 shadow-lg"
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
				onTabChange={(tab) => { exploreOpen = false; historyOpen = false; mobile.setTab(tab); }}
				onSearchToggle={() => mobile.toggleSearch()}
				hasWeather={route.weatherPoints.length > 0}
			/>
		{/if}
	</div>
</div>
{/if}
