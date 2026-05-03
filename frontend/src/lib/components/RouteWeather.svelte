<script lang="ts">
	import { Droplets, Wind, Thermometer, ChevronDown, Clock, Route, ChevronsDownUp, ChevronsUpDown, Save, Fuel, UtensilsCrossed, BedDouble, Mountain, MapPin, Navigation } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';
	import { transitions } from '$lib/utils/transitions';
	import { Tooltip } from '@skeletonlabs/skeleton-svelte';
	import RouteScoreBadge from '$lib/components/RouteScoreBadge.svelte';
	import RouteStops from '$lib/components/RouteStops.svelte';
	import type { RouteStopEntry } from '$lib/components/RouteStops.svelte';
	import { classifyPoint, type RouteAlert } from '$lib/services/alerts';
	import type { RouteScore } from '$lib/services/routeScore';
	import type { WeatherPoint } from '$lib/services/weather';
	import type { ApproachRoute } from '$lib/stores/useRouteSearch.svelte';
	import { ALERT_ICONS, alertColor } from '$lib/utils/alertIcons';
	import { formatTime, formatArrival } from '$lib/utils/routeFormat';
	import { stopColor } from '$lib/utils/stopColors';

	const STOP_ICONS: Record<string, typeof MapPin> = {
		gas_station: Fuel, restaurant: UtensilsCrossed, rest: BedDouble, viewpoint: Mountain, other: MapPin
	};

	interface Props {
		points: WeatherPoint[];
		loading: boolean;
		alerts: RouteAlert[];
		score: RouteScore | null;
		mobile?: boolean;
		onSave?: () => void;
		saving?: boolean;
		stops?: RouteStopEntry[];
		onAddStop?: (stop: RouteStopEntry) => void;
		onRemoveStop?: (index: number) => void;
		onClear?: () => void;
		approachRoute?: ApproachRoute | null;
	}

	let { points, loading, alerts, score, mobile = false, onSave, saving = false, stops = [], onAddStop, onRemoveStop, onClear, approachRoute = null }: Props = $props();

	let collapsed = $state<Set<number>>(new Set());

	let allCollapsed = $derived(
		points.length > 2 && collapsed.size === points.filter((_, i) => isIntermediate(i)).length
	);

	function toggleAll() {
		if (allCollapsed) {
			collapsed = new Set();
		} else {
			collapsed = new Set(points.map((_, i) => i).filter((i) => isIntermediate(i)));
		}
	}

	function toggleCollapse(index: number) {
		const next = new Set(collapsed);
		if (next.has(index)) next.delete(index);
		else next.add(index);
		collapsed = next;
	}

	function isIntermediate(index: number): boolean {
		return index > 0 && index < points.length - 1;
	}

	let cardEls = $state<HTMLElement[]>([]);

	function bracketPath(topEl: HTMLElement, bottomEl: HTMLElement): string {
		const parent = topEl.parentElement!;
		const pRect = parent.getBoundingClientRect();
		const tRect = topEl.getBoundingClientRect();
		const bRect = bottomEl.getBoundingClientRect();

		const x1 = tRect.left - pRect.left;
		const y1 = tRect.top - pRect.top + tRect.height / 2;
		const x2 = bRect.left - pRect.left;
		const y2 = bRect.top - pRect.top + bRect.height / 2;

		const cx = x1 - 14;
		return `M ${x1} ${y1} Q ${cx} ${y1}, ${cx} ${y1 + 12} L ${cx} ${y2 - 12} Q ${cx} ${y2}, ${x2} ${y2}`;
	}

	let paths = $state<string[]>([]);

	function updatePaths() {
		const result: string[] = [];
		for (let i = 0; i < cardEls.length - 1; i++) {
			if (cardEls[i] && cardEls[i + 1]) {
				result.push(bracketPath(cardEls[i], cardEls[i + 1]));
			}
		}
		paths = result;
	}

	$effect(() => {
		collapsed.size;
		points.length;
		if (cardEls.length >= 2) {
			requestAnimationFrame(() => requestAnimationFrame(updatePaths));
		} else {
			paths = [];
		}
	});
</script>

{#snippet alertBadges(pointAlerts: import('$lib/services/alerts').PointAlert[])}
	{#if pointAlerts.length > 0}
		<div class="flex gap-1">
			{#each pointAlerts as pa}
				{@const Icon = ALERT_ICONS[pa.type]}
				<Tooltip positioning={{ placement: 'top', strategy: 'fixed' }} openDelay={200} closeDelay={0}>
					<Tooltip.Trigger>
						<Icon size={14} color={alertColor(pa.severity)} />
					</Tooltip.Trigger>
					<Tooltip.Positioner class="z-[1100]" style="z-index: 1100;">
						<Tooltip.Content class="rounded bg-surface-900 px-2 py-1 text-xs text-white shadow-lg">
							{pa.message}
						</Tooltip.Content>
					</Tooltip.Positioner>
				</Tooltip>
			{/each}
		</div>
	{/if}
{/snippet}

<aside class="flex flex-col gap-1 overflow-y-auto p-4 {mobile ? 'w-full pt-[calc(16px+env(safe-area-inset-top))]' : 'w-80 bg-surface-800'}" style={mobile ? 'padding-bottom: calc(24px + env(safe-area-inset-bottom))' : ''}>
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold text-white">Clima na rota</h2>
		{#if points.length > 2}
			<button type="button" onclick={toggleAll} class="text-surface-400 hover:text-surface-200" title={allCollapsed ? 'Expandir todos' : 'Colapsar todos'}>
				{#if allCollapsed}
					<ChevronsUpDown size={18} />
				{:else}
					<ChevronsDownUp size={18} />
				{/if}
			</button>
		{/if}
	</div>
	{#if onClear && points.length > 0}
		<button type="button" onclick={onClear} class="text-xs text-surface-500 hover:text-surface-300">
			Limpar rota
		</button>
	{/if}

	{#if loading}
		<p class="text-sm text-surface-400" in:fade={transitions.quick}>Carregando clima…</p>
	{:else if points.length === 0}
		<p class="text-sm text-surface-400" in:fade={transitions.quick}>Trace uma rota para ver o clima.</p>
	{:else}
		{#if score}
			<RouteScoreBadge {score} {alerts} />
		{/if}

		{#if approachRoute}
			<div class="my-1 flex items-center gap-3 rounded-lg bg-surface-700 p-3" in:fly={{ ...transitions.card }}>
				<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style="background-color: var(--color-ride-location-900);">
					<Navigation size={20} style="color: var(--color-ride-location-300);" />
				</div>
				<div class="flex flex-1 flex-col gap-0.5">
					<span class="text-sm font-medium text-white">Caminho até a rota</span>
					<div class="flex gap-3 text-xs text-surface-400">
						<span class="flex items-center gap-1"><Route size={11} /> {approachRoute.distanceKm} km</span>
						<span class="flex items-center gap-1"><Clock size={11} /> {formatTime(approachRoute.durationMinutes)}</span>
					</div>
				</div>
			</div>
			<hr class="my-2 border-surface-600" />
		{/if}

		<div class="relative ml-4">
			<svg class="pointer-events-none absolute inset-0 h-full w-full overflow-visible" style="z-index: 0;">
				{#each paths as d}
					<path {d} stroke="var(--color-surface-500)" stroke-width="1.5" stroke-dasharray="4 3" fill="none" />
				{/each}
			</svg>

			<div class="relative flex flex-col gap-1" style="z-index: 1;">
				{#each points as point, i}
					{@const pointAlerts = classifyPoint(point)}
					{#if i > 0}
						<button
							type="button"
							class="flex w-full justify-center py-0.5 text-surface-500 {isIntermediate(i) ? 'cursor-pointer hover:text-surface-300' : 'cursor-default'}"
							onclick={() => isIntermediate(i) && toggleCollapse(i)}
							disabled={!isIntermediate(i)}
						>
							<ChevronDown size={14} class="{collapsed.has(i) ? '-rotate-90' : ''} transition-transform" />
						</button>
					{/if}

					{#if point.stopType}
					{@const StopIcon = STOP_ICONS[point.stopType] ?? MapPin}
					{@const sc = stopColor(point.stopType)}
					<div bind:this={cardEls[i]} class="flex items-center gap-3 rounded-lg bg-surface-700 p-3" in:fly={{ ...transitions.card, delay: i * 50 }}>
						<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style="background-color: var({sc.bg});">
							<StopIcon size={20} style="color: var({sc.fg});" />
						</div>
						<div class="flex flex-1 flex-col gap-0.5">
							<span class="text-sm font-medium text-white">{point.locationName}</span>
							{#if point.distanceKm > 0}
								<div class="flex gap-3 text-xs text-surface-400">
									<span class="flex items-center gap-1"><Route size={11} /> {point.distanceKm} km</span>
									<span class="flex items-center gap-1"><Clock size={11} /> {formatTime(point.estimatedMinutes)}</span>
								</div>
							{/if}
						</div>
					</div>
				{:else if collapsed.has(i)}
						<button
							type="button"
							bind:this={cardEls[i]}
							onclick={() => toggleCollapse(i)}
							class="flex w-full items-center gap-3 rounded-lg bg-surface-700 p-3 text-left hover:bg-surface-600"
						>
							<img src="https://openweathermap.org/img/wn/{point.icon}@2x.png" alt={point.description} class="h-8 w-8" />
							<div class="flex flex-1 flex-col">
								<div class="flex items-center gap-2">
									<span class="text-sm font-bold text-white">{point.temp}°C</span>
									<span class="text-xs capitalize text-surface-300">{point.description}</span>
								</div>
								{#if point.locationName}
									<span class="text-xs text-surface-400">{point.locationName}</span>
								{/if}
							</div>
							{@render alertBadges(pointAlerts)}
						</button>
					{:else}
						<div bind:this={cardEls[i]} class="flex flex-col gap-2 rounded-lg bg-surface-700 p-3" in:fly={{ ...transitions.card, delay: i * 50 }}>
							<div class="flex items-center justify-between pl-1">
								<p class="text-xs text-surface-400">
									{formatArrival(point.estimatedMinutes)}{point.locationName ? ` — ${point.locationName}` : ''}
								</p>
								{@render alertBadges(pointAlerts)}
							</div>
							{#if point.distanceKm > 0}
								<div class="flex gap-3 pl-1 text-xs text-surface-300">
									<span class="flex items-center gap-1"><Route size={12} /> {point.distanceKm} km</span>
									<span class="flex items-center gap-1"><Clock size={12} /> {formatTime(point.estimatedMinutes)}</span>
								</div>
							{/if}
							<div class="flex items-center justify-center gap-3">
								<img src="https://openweathermap.org/img/wn/{point.icon}@2x.png" alt={point.description} class="h-12 w-12" />
								<div>
									<p class="text-lg font-bold text-white">{point.temp}°C</p>
									<p class="text-xs capitalize text-surface-300">{point.description}</p>
								</div>
							</div>
							<div class="flex justify-center gap-4 text-xs text-surface-400">
								<span class="flex items-center gap-1"><Thermometer size={12} /> {point.feelsLike}°C</span>
								<span class="flex items-center gap-1"><Droplets size={12} /> {point.humidity}%</span>
								<span class="flex items-center gap-1"><Wind size={12} /> {point.windSpeed} m/s</span>
							</div>
						</div>
					{/if}
				{/each}
			</div>
		</div>

		{#if onAddStop && onRemoveStop}
			<RouteStops {stops} onAdd={onAddStop} onRemove={onRemoveStop} />
		{/if}
		{#if onSave}
			<button
				type="button"
				onclick={onSave}
				disabled={saving}
				class="group mt-2 flex w-full items-center gap-3 rounded-xl border border-surface-600 bg-surface-700 p-3 text-left transition-all hover:border-primary-500/50 hover:bg-surface-600 disabled:opacity-40"
			>
				<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style="background-color: var(--color-ride-route-500);">
					{#if saving}
						<div class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
					{:else}
						<Save size={18} class="text-white" />
					{/if}
				</div>
				<div class="flex flex-col">
					<span class="text-sm font-semibold text-white">{saving ? 'Salvando rota…' : 'Salvar no histórico'}</span>
					<span class="text-xs text-surface-400">Acesse depois no seu perfil</span>
				</div>
			</button>
		{/if}
	{/if}
</aside>
