<script lang="ts">
	import { Droplets, Wind, Thermometer } from 'lucide-svelte';
	import type { WeatherPoint } from '$lib/services/weather';

	interface Props {
		points: WeatherPoint[];
		loading: boolean;
	}

	let { points, loading }: Props = $props();
</script>

<aside class="flex w-80 flex-col gap-3 overflow-y-auto bg-surface-800 p-4">
	<h2 class="text-lg font-semibold text-white">Clima na rota</h2>

	{#if loading}
		<p class="text-sm text-surface-400">Carregando clima…</p>
	{:else if points.length === 0}
		<p class="text-sm text-surface-400">Trace uma rota para ver o clima.</p>
	{:else}
		{#each points as point, i}
			<div class="flex items-center gap-3 rounded-lg bg-surface-700 p-3">
				<img
					src="https://openweathermap.org/img/wn/{point.icon}@2x.png"
					alt={point.description}
					class="h-12 w-12"
				/>
				<div class="flex-1">
					<p class="text-xs text-surface-400">
						{i === 0 ? 'Origem' : i === points.length - 1 ? 'Destino' : `Ponto ${i}`}
					</p>
					<p class="text-lg font-bold text-white">{point.temp}°C</p>
					<p class="text-xs capitalize text-surface-300">{point.description}</p>
					<div class="mt-1 flex gap-3 text-xs text-surface-400">
						<span class="flex items-center gap-1">
							<Thermometer size={12} />{point.feelsLike}°C
						</span>
						<span class="flex items-center gap-1">
							<Droplets size={12} />{point.humidity}%
						</span>
						<span class="flex items-center gap-1">
							<Wind size={12} />{point.windSpeed} m/s
						</span>
					</div>
				</div>
			</div>
		{/each}
	{/if}
</aside>
