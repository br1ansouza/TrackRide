<script lang="ts">
	import { Compass, Route, Clock, User, X, ArrowDown } from 'lucide-svelte';
	import { Tooltip } from '@skeletonlabs/skeleton-svelte';
	import { fetchNearbyRoutes, type ExploreRoute } from '$lib/services/routes';
	import { getLastPosition } from '$lib/services/geolocation';
	import { toaster } from '$lib/stores/toaster';

	interface Props {
		onSelect: (route: ExploreRoute) => void;
		onClose: () => void;
	}

	let { onSelect, onClose }: Props = $props();

	let routes = $state<ExploreRoute[]>([]);
	let loading = $state(true);

	async function load() {
		const pos = getLastPosition();
		if (!pos) {
			toaster.warning({ title: 'Localização necessária', description: 'Ative o GPS para ver rotas próximas.' });
			loading = false;
			return;
		}
		try {
			const data = await fetchNearbyRoutes(pos[0], pos[1]);
			routes = data.routes;
		} catch {
			toaster.error({ title: 'Erro', description: 'Não foi possível buscar rotas próximas.' });
		} finally {
			loading = false;
		}
	}

	load();

	function formatDuration(minutes: number | null): string {
		if (!minutes) return '';
		if (minutes < 60) return `${minutes} min`;
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		return m > 0 ? `${h}h ${m}min` : `${h}h`;
	}
</script>

<div class="flex flex-col gap-3">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<Tooltip positioning={{ placement: 'bottom', strategy: 'fixed' }} openDelay={200} closeDelay={0}>
				<Tooltip.Trigger>
					<Compass size={18} style="color: var(--color-ride-route-300);" />
				</Tooltip.Trigger>
				<Tooltip.Positioner class="z-[1100]" style="z-index: 1100;">
					<Tooltip.Content class="rounded-md bg-surface-700 px-2 py-1 text-xs text-white shadow-lg">
						Rotas públicas em um raio de 80 km
					</Tooltip.Content>
				</Tooltip.Positioner>
			</Tooltip>
			<h2 class="text-lg font-semibold text-white">Rotas próximas</h2>
		</div>
		<button type="button" onclick={onClose} class="text-surface-400 hover:text-surface-200">
			<X size={18} />
		</button>
	</div>

	{#if loading}
		<p class="text-sm text-surface-400">Buscando rotas…</p>
	{:else if routes.length === 0}
		<p class="text-sm text-surface-400">Nenhuma rota pública encontrada por perto.</p>
	{:else}
		{#each routes as route}
			<button
				type="button"
				onclick={() => onSelect(route)}
				class="flex flex-col gap-1 rounded-lg bg-surface-700 p-3 text-left transition-colors hover:bg-surface-600"
			>
				<span class="text-sm font-medium text-white">{route.origin_name}</span>
				<span class="flex items-center gap-1 text-xs text-surface-400"><ArrowDown size={10} /> {route.destination_name}</span>
				<div class="flex flex-wrap gap-3 text-xs text-surface-400">
					{#if route.distance_km}
						<span class="flex items-center gap-1"><Route size={12} /> {Math.round(route.distance_km)} km</span>
					{/if}
					{#if route.duration_minutes}
						<span class="flex items-center gap-1"><Clock size={12} /> {formatDuration(route.duration_minutes)}</span>
					{/if}
					<span class="flex items-center gap-1"><User size={12} /> {route.author_name}</span>
				</div>
				{#if route.score}
					<div class="mt-1">
						<span class="text-xs font-bold" style="color: var({route.score >= 80 ? '--color-ride-safe-300' : route.score >= 55 ? '--color-ride-alert-300' : '--color-ride-danger-300'});">
							Condição da rota: {route.score}
						</span>
					</div>
				{/if}
			</button>
		{/each}
	{/if}
</div>
