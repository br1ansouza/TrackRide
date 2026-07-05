<script lang="ts">
	import { onMount } from 'svelte';
	import { Toast } from '@skeletonlabs/skeleton-svelte';
	import { toaster } from '$lib/stores/toaster';
	import { hideSystemBars } from '$lib/utils/systemBars';
	import favicon from '$lib/assets/favicon.png';
	import '../app.css';

	let { children } = $props();

	onMount(() => {
		hideSystemBars();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<Toast.Group {toaster}>
	{#snippet children(toast)}
		<Toast {toast} class="preset-filled-{toast.type === 'error' ? 'error' : toast.type === 'warning' ? 'warning' : toast.type === 'success' ? 'primary' : 'surface'}-500">
			<div class="flex flex-1 flex-col">
				<Toast.Title class="font-bold">{toast.title}</Toast.Title>
				{#if toast.description}
					<Toast.Description class="text-xs">{toast.description}</Toast.Description>
				{/if}
			</div>
			<Toast.CloseTrigger />
		</Toast>
	{/snippet}
</Toast.Group>
