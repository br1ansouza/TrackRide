<script lang="ts">
	import { Droplets, Wind, Thermometer, ChevronDown, Clock, Route, ChevronsDownUp, ChevronsUpDown, CloudRain, Eye } from 'lucide-svelte';
	import { Tooltip } from '@skeletonlabs/skeleton-svelte';
	import RouteScoreBadge from '$lib/components/RouteScoreBadge.svelte';
	import { classifyPoint, type AlertType, type RouteAlert } from '$lib/services/alerts';
	import type { RouteScore } from '$lib/services/routeScore';
	import type { WeatherPoint } from '$lib/services/weather';
	import { cssVar } from '$lib/utils/color';

	interface Props {
		points: WeatherPoint[];
		loading: boolean;
		alerts: RouteAlert[];
		score: RouteScore | null;
	}

	let { points, loading, alerts, score }: Props = $props();

	let collapsed = $state<Set<number>>(new Set());

	let allCollapsed = $derived(
		points.length > 2 && collapsed.size === points.filter((_, i) => isIntermediate(i)).length
	);

	const ALERT_ICONS: Record<AlertType, typeof CloudRain> = {
		rain: CloudRain,
		wind: Wind,
		visibility: Eye
	};

	function alertColor(severity: 'warning' | 'danger'): string {
		const token = severity === 'danger' ? '--color-ride-danger-300' : '--color-ride-alert-300';
		return cssVar(token);
	}

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

	function formatTime(minutes: number): string {
		if (minutes < 60) return `${minutes} min`;
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		return m > 0 ? `${h}h ${m}min` : `${h}h`;
	}

	function formatArrival(minutes: number): string {
		if (minutes === 0) return 'Agora';
		const arrival = new Date(Date.now() + minutes * 60000);
		return `~${arrival.getHours().toString().padStart(2, '0')}:${arrival.getMinutes().toString().padStart(2, '0')}`;
	}
</script>

<aside class="flex w-80 flex-col gap-1 overflow-y-auto bg-surface-800 p-4">
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

	{#if loading}
		<p class="text-sm text-surface-400">Carregando clima…</p>
	{:else if points.length === 0}
		<p class="text-sm text-surface-400">Trace uma rota para ver o clima.</p>
	{:else}
		{#if score}
			<RouteScoreBadge {score} {alerts} />
		{/if}
		{#each points as point, i}
			{@const pointAlerts = classifyPoint(point)}
			{#if i > 0}
				<button
					type="button"
					class="flex w-full justify-center py-1 text-surface-500 {isIntermediate(i) ? 'cursor-pointer hover:text-surface-300' : 'cursor-default'}"
					onclick={() => isIntermediate(i) && toggleCollapse(i)}
					disabled={!isIntermediate(i)}
				>
					<ChevronDown size={16} class="{collapsed.has(i) ? '-rotate-90' : ''} transition-transform" />
				</button>
			{/if}
			{#if collapsed.has(i)}
				<button
					type="button"
					onclick={() => toggleCollapse(i)}
					class="flex w-full items-center gap-3 rounded-lg bg-surface-700 p-3 text-left hover:bg-surface-600"
				>
					<img
						src="https://openweathermap.org/img/wn/{point.icon}@2x.png"
						alt={point.description}
						class="h-8 w-8"
					/>
					<div class="flex flex-1 flex-col">
						<div class="flex items-center gap-2">
							<span class="text-sm font-bold text-white">{point.temp}°C</span>
							<span class="text-xs capitalize text-surface-300">{point.description}</span>
						</div>
						{#if point.locationName}
							<span class="text-xs text-surface-400">{point.locationName}</span>
						{/if}
					</div>
					{#if pointAlerts.length > 0}
						<div class="flex gap-1">
							{#each pointAlerts as pa}
								{@const Icon = ALERT_ICONS[pa.type]}
								<Tooltip positioning={{ placement: 'top' }} openDelay={200} closeDelay={0}>
									<Tooltip.Trigger>
										<Icon size={14} color={alertColor(pa.severity)} />
									</Tooltip.Trigger>
									<Tooltip.Positioner>
										<Tooltip.Content class="rounded bg-surface-900 px-2 py-1 text-xs text-white shadow-lg">
											{pa.message}
										</Tooltip.Content>
									</Tooltip.Positioner>
								</Tooltip>
							{/each}
						</div>
					{/if}
				</button>
			{:else}
				<div class="flex flex-col gap-2 rounded-lg bg-surface-700 p-3">
					<div class="flex items-center justify-between pl-1">
						<p class="text-xs text-surface-400">
							{formatArrival(point.estimatedMinutes)}{point.locationName ? ` — ${point.locationName}` : ''}
						</p>
						{#if pointAlerts.length > 0}
							<div class="flex gap-1">
								{#each pointAlerts as pa}
									{@const Icon = ALERT_ICONS[pa.type]}
									<Tooltip positioning={{ placement: 'top' }} openDelay={200} closeDelay={0}>
										<Tooltip.Trigger>
											<Icon size={14} color={alertColor(pa.severity)} />
										</Tooltip.Trigger>
										<Tooltip.Positioner>
											<Tooltip.Content class="rounded bg-surface-900 px-2 py-1 text-xs text-white shadow-lg">
												{pa.message}
											</Tooltip.Content>
										</Tooltip.Positioner>
									</Tooltip>
								{/each}
							</div>
						{/if}
					</div>
					{#if point.distanceKm > 0}
						<div class="flex gap-3 pl-1 text-xs text-surface-300">
							<span class="flex items-center gap-1">
								<Route size={12} /> {point.distanceKm} km
							</span>
							<span class="flex items-center gap-1">
								<Clock size={12} /> {formatTime(point.estimatedMinutes)}
							</span>
						</div>
					{/if}
					<div class="flex items-center gap-3">
						<img
							src="https://openweathermap.org/img/wn/{point.icon}@2x.png"
							alt={point.description}
							class="h-12 w-12"
						/>
						<div class="flex-1">
							<p class="text-lg font-bold text-white">{point.temp}°C</p>
							<p class="text-xs capitalize text-surface-300">{point.description}</p>
						</div>
					</div>
					<div class="flex gap-4 text-xs text-surface-400">
						<span class="flex items-center gap-1">
							<Thermometer size={12} /> {point.feelsLike}°C
						</span>
						<span class="flex items-center gap-1">
							<Droplets size={12} /> {point.humidity}%
						</span>
						<span class="flex items-center gap-1">
							<Wind size={12} /> {point.windSpeed} m/s
						</span>
					</div>
				</div>
			{/if}
		{/each}
	{/if}
</aside>
