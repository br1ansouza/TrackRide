<script lang="ts">
	import { Square, Route, Clock, Gauge } from 'lucide-svelte';
	import { safeTop, safeBottom } from '$lib/utils/safeArea';

	interface Props {
		distanceKm: number;
		elapsed: string;
		speed: number;
		onStop: () => void;
	}

	let { distanceKm, elapsed, speed, onStop }: Props = $props();
</script>

<div class="absolute inset-x-0 z-[700] flex justify-center px-4" style="top: {safeTop};">
	<div class="flex items-center gap-4 rounded-2xl bg-surface-900/90 px-5 py-3 shadow-lg backdrop-blur-sm">
		<div class="flex flex-col items-center">
			<span class="text-lg font-bold text-white">{distanceKm}</span>
			<span class="flex items-center gap-1 text-[10px] text-surface-400"><Route size={10} /> km</span>
		</div>
		<div class="h-8 w-px bg-surface-700"></div>
		<div class="flex flex-col items-center">
			<span class="text-lg font-bold text-white">{elapsed}</span>
			<span class="flex items-center gap-1 text-[10px] text-surface-400"><Clock size={10} /> tempo</span>
		</div>
		<div class="h-8 w-px bg-surface-700"></div>
		<div class="flex flex-col items-center">
			<span class="text-lg font-bold text-white">{speed}</span>
			<span class="flex items-center gap-1 text-[10px] text-surface-400"><Gauge size={10} /> km/h</span>
		</div>
	</div>
</div>

<div class="absolute inset-x-0 z-[700] flex justify-center" style="bottom: {safeBottom};">
	<button
		type="button"
		onclick={onStop}
		class="flex items-center gap-2 rounded-full px-6 py-3 shadow-lg transition-colors"
		style="background-color: var(--color-ride-danger-500);"
	>
		<Square size={18} class="text-white" fill="white" />
		<span class="text-sm font-semibold text-white">Encerrar rota</span>
	</button>
</div>
