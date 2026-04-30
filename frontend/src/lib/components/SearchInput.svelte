<script lang="ts">
	import { MapPin } from 'lucide-svelte';
	import type { LatLng } from '$lib/services/routing';
	import { getCurrentPosition, getLastPosition } from '$lib/services/geolocation';
	import { toaster } from '$lib/stores/toaster';

	export type SearchResult = {
		label: string;
		lat: number;
		lon: number;
	};

	type Props = {
		placeholder: string;
		showMyLocation?: boolean;
		large?: boolean;
		onselect: (label: string, coords: LatLng) => void;
	};

	let { placeholder, showMyLocation = false, large = false, onselect }: Props = $props();

	let query = $state('');
	let results = $state<SearchResult[]>([]);
	let open = $state(false);
	let loading = $state(false);
	let isMyLocation = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout>;

	function handleInput() {
		isMyLocation = false;
		clearTimeout(debounceTimer);
		if (query.length < 5) {
			results = [];
			open = false;
			loading = false;
			return;
		}
		loading = true;
		open = true;
		debounceTimer = setTimeout(() => search(query), 400);
	}

	async function search(q: string) {
		loading = true;
		const response = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
		results = await response.json();
		loading = false;
		open = results.length > 0;
	}

	function selectResult(result: SearchResult) {
		query = result.label;
		isMyLocation = false;
		open = false;
		results = [];
		onselect(result.label, [result.lat, result.lon]);
	}

	async function selectMyLocation() {
		const cached = getLastPosition();
		if (cached) {
			query = 'Minha localização';
			isMyLocation = true;
			open = false;
			results = [];
			onselect('Minha localização', cached);
			return;
		}
		await getCurrentPosition({
			onPosition(coords) {
				query = 'Minha localização';
				isMyLocation = true;
				open = false;
				results = [];
				onselect('Minha localização', coords);
			},
			onError(message) {
				toaster.error({ title: 'Erro de localização', description: message });
				open = false;
			}
		});
	}

	function handleFocus() {
		if (showMyLocation || results.length > 0) open = true;
	}

	function handleBlur() {
		setTimeout(() => (open = false), 200);
	}
</script>

<div class="relative flex-1">
	<div class="relative">
		{#if isMyLocation}
			<span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white">
				<MapPin size={14} />
			</span>
		{/if}
		<input
			type="text"
			{placeholder}
			bind:value={query}
			oninput={handleInput}
			onfocus={handleFocus}
			onblur={handleBlur}
			class="input w-full rounded-md bg-surface-800 text-white placeholder-surface-400 {isMyLocation ? 'pl-8' : 'pl-3'} {large ? 'py-3 pr-3 text-base' : 'py-2 pr-3 text-sm'}"
		/>
	</div>
	{#if open}
		<ul class="absolute z-[1000] mt-1 w-full overflow-hidden rounded-md bg-surface-800 shadow-lg">
			{#if showMyLocation}
				<li>
					<button
						type="button"
						onclick={selectMyLocation}
						class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white hover:bg-surface-700"
					>
						<MapPin size={16} />
						Minha localização
					</button>
				</li>
				<li><hr class="border-surface-700" /></li>
			{/if}
			{#if loading}
				<li class="px-3 py-2 text-sm text-surface-400">Buscando...</li>
			{/if}
			{#each results as result}
				<li>
					<button
						type="button"
						onclick={() => selectResult(result)}
						class="w-full px-3 py-2 text-left text-sm text-white hover:bg-surface-700"
					>
						{result.label}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
