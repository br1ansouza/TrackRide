import { onMount } from 'svelte';

export type MobileTab = 'map' | 'weather' | 'profile';

let isMobile = $state(false);
let activeTab = $state<MobileTab>('map');
let searchOpen = $state(false);

export function useMobile() {
	onMount(() => {
		const mq = window.matchMedia('(pointer: coarse)');
		isMobile = mq.matches;
		const handler = (e: MediaQueryListEvent) => (isMobile = e.matches);
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	});

	return {
		get isMobile() { return isMobile; },
		get activeTab() { return activeTab; },
		get searchOpen() { return searchOpen; },
		setTab(tab: MobileTab) { activeTab = tab; searchOpen = false; },
		toggleSearch() { if (!searchOpen) activeTab = 'map'; searchOpen = !searchOpen; }
	};
}
