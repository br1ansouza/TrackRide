<script lang="ts">
	import { Map, Search, CloudSun } from 'lucide-svelte';
	import type { MobileTab } from '$lib/stores/mobile.svelte';

	interface Props {
		activeTab: MobileTab;
		searchOpen: boolean;
		onTabChange: (tab: MobileTab) => void;
		onSearchToggle: () => void;
		hasWeather?: boolean;
	}

	let { activeTab, searchOpen, onTabChange, onSearchToggle, hasWeather = false }: Props = $props();
</script>

<nav class="fixed bottom-0 left-0 right-0 z-[1000] flex border-t border-surface-700 bg-surface-900" style="padding-bottom: env(safe-area-inset-bottom);">
	<button
		type="button"
		onclick={() => onTabChange('map')}
		class="flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors"
		style="color: var({activeTab === 'map' && !searchOpen ? '--color-ride-route-300' : '--color-surface-400'});"
	>
		<Map size={20} />
		<span class="text-[10px] font-medium">Mapa</span>
	</button>

	<button
		type="button"
		onclick={() => onTabChange('weather')}
		class="flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors"
		class:opacity-40={!hasWeather}
		style="color: var({activeTab === 'weather' && !searchOpen ? '--color-ride-route-300' : '--color-surface-400'});"
	>
		<CloudSun size={20} />
		<span class="text-[10px] font-medium">Clima</span>
	</button>

	<button
		type="button"
		onclick={onSearchToggle}
		class="flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors"
		style="color: var({searchOpen ? '--color-ride-route-300' : '--color-surface-400'});"
	>
		<Search size={20} />
		<span class="text-[10px] font-medium">Buscar</span>
	</button>
</nav>
