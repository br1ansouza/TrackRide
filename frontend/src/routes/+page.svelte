<script lang="ts">
	import Map from '$lib/components/Map.svelte';

	let originInput = $state('');
	let destinationInput = $state('');
	let origin = $state('');
	let destination = $state('');

	function handleSearch() {
		origin = originInput;
		destination = destinationInput;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') handleSearch();
	}
</script>

<div class="flex h-screen flex-col">
	<header class="flex items-center gap-4 bg-surface-900 p-4">
		<h1 class="text-xl font-bold text-white">TrackRide</h1>
		<div class="flex flex-1 items-center gap-2">
			<input
				type="text"
				placeholder="Origem"
				bind:value={originInput}
				onkeydown={handleKeydown}
				class="input flex-1 rounded-md bg-surface-800 px-3 py-2 text-sm text-white placeholder-surface-400"
			/>
			<input
				type="text"
				placeholder="Destino"
				bind:value={destinationInput}
				onkeydown={handleKeydown}
				class="input flex-1 rounded-md bg-surface-800 px-3 py-2 text-sm text-white placeholder-surface-400"
			/>
			<button onclick={handleSearch} class="btn preset-filled-primary-500 rounded-md px-4 py-2 text-sm">
				Buscar rota
			</button>
		</div>
	</header>
	<main class="min-h-0 flex-1">
		<Map {origin} {destination} />
	</main>
</div>
