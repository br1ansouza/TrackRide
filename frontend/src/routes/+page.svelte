<script lang="ts">
	import Map from '$lib/components/Map.svelte';
	import SearchInput from '$lib/components/SearchInput.svelte';
	import type { LatLng } from '$lib/services/routing';

	let originCoords = $state<LatLng | null>(null);
	let destCoords = $state<LatLng | null>(null);
	let mapRef: ReturnType<typeof Map>;

	function handleSearch() {
		if (originCoords && destCoords) {
			mapRef.drawRoute(originCoords, destCoords);
		}
	}
</script>

<div class="flex h-screen flex-col">
	<header class="flex items-center gap-4 bg-surface-900 p-4">
		<h1 class="text-xl font-bold text-white">TrackRide</h1>
		<div class="flex flex-1 items-center gap-2">
			<SearchInput
				placeholder="Origem"
				showMyLocation
				onselect={(_, coords) => (originCoords = coords)}
			/>
			<SearchInput
				placeholder="Destino"
				onselect={(_, coords) => (destCoords = coords)}
			/>
			<button onclick={handleSearch} class="btn preset-filled-primary-500 rounded-md px-4 py-2 text-sm">
				Buscar rota
			</button>
		</div>
	</header>
	<main class="min-h-0 flex-1">
		<Map bind:this={mapRef} />
	</main>
</div>
