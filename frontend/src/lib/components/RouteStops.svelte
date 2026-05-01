<script lang="ts">
	import { Plus, X, Fuel, UtensilsCrossed, BedDouble, Mountain, MapPin } from 'lucide-svelte';
	import SearchInput from '$lib/components/SearchInput.svelte';
	import type { LatLng } from '$lib/services/routing';
	import { stopColor } from '$lib/utils/stopColors';

	export type StopType = 'other' | 'gas_station' | 'restaurant' | 'rest' | 'viewpoint';

	export interface RouteStopEntry {
		name: string;
		coords: LatLng;
		stopType: StopType;
	}

	interface Props {
		stops: RouteStopEntry[];
		onAdd: (stop: RouteStopEntry) => void;
		onRemove: (index: number) => void;
	}

	let { stops, onAdd, onRemove }: Props = $props();

	let adding = $state(false);
	let selectedIndex = $state(0);
	let dragging = $state(false);
	let trackEl = $state<HTMLDivElement>();

	const STOP_TYPES: { value: StopType; label: string; icon: typeof MapPin }[] = [
		{ value: 'gas_station', label: 'Posto', icon: Fuel },
		{ value: 'restaurant', label: 'Restaurante', icon: UtensilsCrossed },
		{ value: 'rest', label: 'Descanso', icon: BedDouble },
		{ value: 'viewpoint', label: 'Mirante', icon: Mountain },
		{ value: 'other', label: 'Outro', icon: MapPin }
	];

	let selectedType = $derived(STOP_TYPES[selectedIndex].value);
	let thumbPercent = $derived((selectedIndex / (STOP_TYPES.length - 1)) * 100);
	let thumbColor = $derived(stopColor(selectedType).marker);

	function indexFromX(clientX: number) {
		if (!trackEl) return 0;
		const rect = trackEl.getBoundingClientRect();
		const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
		return Math.round(ratio * (STOP_TYPES.length - 1));
	}

	function onPointerDown(e: PointerEvent) {
		dragging = true;
		selectedIndex = indexFromX(e.clientX);
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onPointerMove(e: PointerEvent) {
		if (!dragging) return;
		selectedIndex = indexFromX(e.clientX);
	}

	function onPointerUp() {
		dragging = false;
	}

	function handleSelect(label: string, coords: LatLng) {
		onAdd({ name: label, coords, stopType: selectedType });
		adding = false;
		selectedIndex = 0;
	}

	export function stopIcon(type: StopType) {
		return STOP_TYPES.find((t) => t.value === type)?.icon ?? MapPin;
	}
</script>

<div class="mt-4 flex flex-col gap-2">
	<hr class="border-surface-600" />
	{#if stops.length > 0}
		<span class="text-xs font-medium text-surface-400">Paradas ({stops.length})</span>
		{#each stops as stop, i}
			{@const Icon = stopIcon(stop.stopType)}
			{@const colors = stopColor(stop.stopType)}
			<div class="flex items-center gap-2 rounded-lg bg-surface-700 px-3 py-2">
				<Icon size={14} style="color: var({colors.fg});" />
				<span class="min-w-0 flex-1 truncate text-sm text-white">{stop.name}</span>
				<button type="button" onclick={() => onRemove(i)} class="shrink-0 text-surface-500 hover:text-surface-300">
					<X size={14} />
				</button>
			</div>
		{/each}
	{/if}

	{#if adding}
		<div class="flex flex-col gap-3 rounded-lg bg-surface-700 p-3">
			<div class="flex flex-col gap-2">
				<div class="flex justify-between px-1">
					{#each STOP_TYPES as st, i}
						{@const Icon = st.icon}
						{@const c = stopColor(st.value)}
						<button
							type="button"
							onclick={() => selectedIndex = i}
							class="flex flex-col items-center gap-0.5 transition-colors"
							title={st.label}
						>
							<Icon size={16} style="color: var({selectedIndex === i ? c.fg : '--color-surface-500'});" />
							<span class="text-[9px] leading-tight {selectedIndex === i ? 'text-white' : 'text-surface-500'}">{st.label}</span>
						</button>
					{/each}
				</div>

				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					bind:this={trackEl}
					class="relative mx-1 h-6 cursor-pointer select-none touch-none"
					onpointerdown={onPointerDown}
					onpointermove={onPointerMove}
					onpointerup={onPointerUp}
				>
					<div class="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-surface-600"></div>

					{#each STOP_TYPES as st, i}
						{@const c = stopColor(st.value)}
						<div
							class="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
							style="left: {(i / (STOP_TYPES.length - 1)) * 100}%; background-color: var({selectedIndex === i ? c.fg : '--color-surface-500'});"
						></div>
					{/each}

					<div
						class="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-md transition-[left,background-color] duration-100"
						style="left: {thumbPercent}%; background-color: var({thumbColor});"
					></div>
				</div>
			</div>

			<SearchInput placeholder="Buscar local da parada" onselect={handleSelect} />
			<button type="button" onclick={() => adding = false} class="text-xs text-surface-400 hover:text-surface-200">
				Cancelar
			</button>
		</div>
	{:else}
		<button
			type="button"
			onclick={() => adding = true}
			class="flex items-center gap-2 rounded-lg border border-dashed border-surface-600 px-3 py-2 text-sm text-surface-400 transition-colors hover:border-surface-400 hover:text-surface-200"
		>
			<Plus size={14} />
			Adicionar parada
		</button>
	{/if}
</div>
