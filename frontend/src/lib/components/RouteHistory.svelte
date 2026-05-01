<script lang="ts">
	import { onMount } from 'svelte';
	import { Route, Clock, Trash2, ChevronRight } from 'lucide-svelte';
	import { fetchSavedRoutes, deleteRoute, updateRoute, type SavedRoute } from '$lib/services/routes';
	import { toaster } from '$lib/stores/toaster';

	interface Props {
		limit?: number;
		showViewAll?: boolean;
		onViewAll?: () => void;
	}

	let { limit = 0, showViewAll = false, onViewAll }: Props = $props();

	let routes = $state<SavedRoute[]>([]);
	let total = $state(0);
	let loading = $state(true);
	let enrichedNames = $state<Record<number, string>>({});

	onMount(() => loadRoutes());

	async function enrichName(route: SavedRoute): Promise<string> {
		if (!route.name.startsWith('Minha localização →')) return route.name;
		try {
			const [lon, lat] = route.origin_coords;
			const res = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lon}`);
			const data = await res.json();
			if (data.district) {
				const enrichedOrigin = `Minha localização (${data.district})`;
				const enrichedName = route.name.replace('Minha localização', enrichedOrigin);
				updateRoute(route.id, { name: enrichedName, origin_name: enrichedOrigin }).catch(() => {});
				return enrichedName;
			}
		} catch {}
		return route.name;
	}

	async function loadRoutes() {
		loading = true;
		try {
			const data = await fetchSavedRoutes(limit || 100);
			routes = data.routes;
			total = data.total;
			for (const route of routes) {
				enrichName(route).then(name => { enrichedNames[route.id] = name; });
			}
		} catch {
			toaster.error({ title: 'Erro', description: 'Não foi possível carregar as rotas.' });
		} finally {
			loading = false;
		}
	}

	async function handleDelete(id: number) {
		try {
			await deleteRoute(id);
			routes = routes.filter(r => r.id !== id);
			total--;
			toaster.success({ title: 'Rota removida', description: 'A rota foi excluída.' });
		} catch {
			toaster.error({ title: 'Erro', description: 'Não foi possível remover a rota.' });
		}
	}

	function formatDate(date: string): string {
		return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	function formatDuration(minutes: number | null): string {
		if (!minutes) return '';
		if (minutes < 60) return `${minutes} min`;
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		return m > 0 ? `${h}h ${m}min` : `${h}h`;
	}
</script>

<div class="flex flex-col gap-2">
	<span class="text-xs font-medium text-surface-400">Histórico de viagens ({total})</span>

	{#if loading}
		<p class="text-sm text-surface-400">Carregando…</p>
	{:else if routes.length === 0}
		<p class="text-sm text-surface-400">Nenhuma rota salva.</p>
	{:else}
		{#each routes as route}
			<div class="flex items-center gap-3 rounded-lg bg-surface-700 p-3">
				<div class="flex flex-1 flex-col gap-1">
					<span class="text-sm font-medium text-white">{enrichedNames[route.id] ?? route.name}</span>
					<div class="flex flex-wrap gap-3 text-xs text-surface-400">
						{#if route.distance_km}
							<span class="flex items-center gap-1">
								<Route size={12} /> {Math.round(route.distance_km)} km
							</span>
						{/if}
						{#if route.duration_minutes}
							<span class="flex items-center gap-1">
								<Clock size={12} /> {formatDuration(route.duration_minutes)}
							</span>
						{/if}
						<span>{formatDate(route.created_at)}</span>
					</div>
				</div>
				{#if route.score}
					<span class="text-sm font-bold" style="color: var({route.score >= 80 ? '--color-ride-safe-300' : route.score >= 55 ? '--color-ride-alert-300' : '--color-ride-danger-300'});">
						{route.score}
					</span>
				{/if}
				<button
					type="button"
					onclick={() => handleDelete(route.id)}
					class="text-surface-500 hover:text-surface-300"
				>
					<Trash2 size={16} />
				</button>
			</div>
		{/each}

		{#if showViewAll && total > (limit || 0)}
			<button
				type="button"
				onclick={onViewAll}
				class="flex items-center justify-center gap-1 rounded-lg py-2 text-sm font-medium"
				style="color: var(--color-ride-route-300);"
			>
				Ver todas ({total})
				<ChevronRight size={14} />
			</button>
		{/if}
	{/if}
</div>
