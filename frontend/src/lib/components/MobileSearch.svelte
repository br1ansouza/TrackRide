<script lang="ts">
	import { Navigation, X } from 'lucide-svelte';
	import SearchInput from '$lib/components/SearchInput.svelte';
	import type { LatLng } from '$lib/services/routing';
	import { safeBottomNav } from '$lib/utils/safeArea';
	import { fly } from 'svelte/transition';
	import { transitions } from '$lib/utils/transitions';

	interface Props {
		canSearch: boolean;
		loading: boolean;
		onOriginSelect: (label: string, coords: LatLng) => void;
		onDestSelect: (label: string, coords: LatLng) => void;
		onSearch: () => void;
		onClose: () => void;
	}

	let { canSearch, loading, onOriginSelect, onDestSelect, onSearch, onClose }: Props = $props();
</script>

<div class="absolute inset-x-3 z-[900] flex flex-col gap-3 rounded-xl bg-surface-900/95 p-4 shadow-xl backdrop-blur-sm" style="bottom: {safeBottomNav};" transition:fly={transitions.popup}>
	<div class="flex items-center justify-between">
		<span class="text-sm font-semibold text-white">Planejar rota</span>
		<button type="button" onclick={onClose} class="text-surface-400">
			<X size={18} />
		</button>
	</div>

	<SearchInput
		placeholder="De onde você sai?"
		showMyLocation
		onselect={onOriginSelect}
		large
	/>

	<SearchInput
		placeholder="Para onde vai?"
		onselect={onDestSelect}
		large
	/>

	<button
		onclick={onSearch}
		disabled={!canSearch || loading}
		class="btn preset-filled-primary-500 flex items-center justify-center gap-2 rounded-lg py-3 text-base font-semibold disabled:opacity-40"
	>
		<Navigation size={18} />
		{loading ? 'Buscando…' : 'Buscar rota'}
	</button>
</div>
