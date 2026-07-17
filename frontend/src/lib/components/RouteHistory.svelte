<script lang="ts">
	import { onMount } from 'svelte';
	import { Route, Clock, Trash2, ChevronRight, Globe, Lock, ArrowDown } from 'lucide-svelte';
	import { fetchSavedRoutes, deleteRoute, updateRoute, type SavedRoute } from '$lib/services/routes';
	import { reverseDistrict } from '$lib/services/gateway';
	import { toaster } from '$lib/stores/toaster';
	import { stopColor } from '$lib/utils/stopColors';
	import { stopIcon } from '$lib/utils/stopIcons';

	interface Props {
		limit?: number;
		showViewAll?: boolean;
		onViewAll?: () => void;
		onSelect?: (route: SavedRoute) => void;
	}

	let { limit = 0, showViewAll = false, onViewAll, onSelect }: Props = $props();

	let routes = $state<SavedRoute[]>([]);
	let total = $state(0);
	let loading = $state(true);

	onMount(() => loadRoutes());

	async function enrichName(route: SavedRoute): Promise<void> {
		if (!route.origin_name.startsWith('Minha localização')) return;
		if (route.origin_name.includes('(')) return;
		const [lon, lat] = route.origin_coords;
		const district = await reverseDistrict(lat, lon);
		if (district) {
			const enriched = `Minha localização (${district})`;
			route.origin_name = enriched;
			routes = [...routes];
			updateRoute(route.id, { name: `${enriched} → ${route.destination_name}`, origin_name: enriched })
				.catch(() => toaster.warning({ title: 'Aviso', description: 'Não foi possível atualizar o nome da rota.' }));
		}
	}

	async function loadRoutes() {
		loading = true;
		try {
			const data = await fetchSavedRoutes(limit || 100);
			routes = data.routes;
			total = data.total;
			for (const route of routes) {
				enrichName(route);
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

	async function togglePublic(route: SavedRoute) {
		try {
			await updateRoute(route.id, { public: !route.public });
			route.public = !route.public;
			routes = [...routes];
			toaster.success({ title: route.public ? 'Rota pública' : 'Rota privada', description: route.public ? 'Outros motociclistas podem ver esta rota.' : 'Apenas você pode ver esta rota.' });
		} catch (err) {
			const msg = err instanceof Error ? err.message : '';
			if (msg.includes('Já existe')) {
				toaster.warning({ title: 'Trajeto já compartilhado', description: 'Outro motociclista já publicou uma rota com origem e destino semelhantes.' });
			} else if (msg.includes('curta')) {
				toaster.warning({ title: 'Rota muito curta', description: 'Rotas com menos de 5 km não podem ser compartilhadas. A análise de clima não seria relevante.' });
			} else if (msg.includes('longa')) {
				toaster.warning({ title: 'Rota muito longa', description: 'Rotas acima de 1.000 km não podem ser compartilhadas. Divida em etapas menores.' });
			} else {
				toaster.error({ title: 'Erro', description: 'Não foi possível alterar a visibilidade.' });
			}
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
			<div
				role="button"
				tabindex="0"
				onclick={() => onSelect?.(route)}
				onkeydown={(e) => { if (e.key === 'Enter') onSelect?.(route); }}
				class="flex items-center gap-3 rounded-lg bg-surface-700 p-3 text-left transition-colors {onSelect ? 'hover:bg-surface-600' : ''}"
			>
				<div class="flex flex-1 flex-col gap-1">
					<div class="flex flex-col text-sm font-medium text-white">
						<span>{route.origin_name}</span>
						<span class="flex items-center gap-1 text-xs text-surface-400"><ArrowDown size={10} /> {route.destination_name}</span>
					</div>
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
					{#if route.stops?.length > 0}
						<div class="flex flex-wrap gap-1">
							{#each route.stops as stop}
								{@const Icon = stopIcon(stop.stop_type)}
								{@const sc = stopColor(stop.stop_type)}
								<span class="flex items-center gap-1 rounded-md bg-surface-600 px-2 py-0.5 text-xs" style="color: var({sc.fg});">
									<Icon size={10} /> {stop.name}
								</span>
							{/each}
						</div>
					{/if}
				</div>
				{#if route.score}
					<span class="text-sm font-bold" style="color: var({route.score >= 80 ? '--color-ride-safe-300' : route.score >= 55 ? '--color-ride-alert-300' : '--color-ride-danger-300'});">
						{route.score}
					</span>
				{/if}
				<button
					type="button"
					onclick={(e) => { e.stopPropagation(); togglePublic(route); }}
					class="text-surface-500 hover:text-surface-300"
					title={route.public ? 'Tornar privada' : 'Tornar pública'}
				>
					{#if route.public}
						<Globe size={16} style="color: var(--color-ride-safe-300);" />
					{:else}
						<Lock size={16} />
					{/if}
				</button>
				<button
					type="button"
					onclick={(e) => { e.stopPropagation(); handleDelete(route.id); }}
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
