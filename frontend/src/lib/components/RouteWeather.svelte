<script lang="ts">
	import { Droplets, Wind, Thermometer, ChevronDown, Clock, Route, ChevronsDownUp, ChevronsUpDown } from 'lucide-svelte';
	import type { WeatherPoint } from '$lib/services/weather';

	interface Props {
		points: WeatherPoint[];
		loading: boolean;
	}

	let { points, loading }: Props = $props();

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

	function formatTime(minutes: number): string {
		if (minutes < 60) return `${minutes} min`;
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		return m > 0 ? `${h}h ${m}min` : `${h}h`;
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
		{#each points as point, i}
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
					<div class="flex flex-col">
						<div class="flex items-center gap-2">
							<span class="text-sm font-bold text-white">{point.temp}°C</span>
							<span class="text-xs capitalize text-surface-300">{point.description}</span>
						</div>
						{#if point.locationName}
							<span class="text-xs text-surface-400">{point.locationName}</span>
						{/if}
					</div>
				</button>
			{:else}
				<div class="flex flex-col gap-2 rounded-lg bg-surface-700 p-3">
					<p class="pl-1 text-xs text-surface-400">
						{i === 0 ? 'Origem' : i === points.length - 1 ? 'Destino' : `Ponto ${i}`}{point.locationName ? ` — ${point.locationName}` : ''}
					</p>
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
							<Thermometer size={12} /> Sensação {point.feelsLike}°C
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
