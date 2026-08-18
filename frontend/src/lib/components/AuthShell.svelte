<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { Route } from 'lucide-svelte';
	import { transitions } from '$lib/utils/transitions';
	import backgroundImg from '$lib/assets/background-trackride.png';
	import '$lib/styles/login-layout.css';
	import '$lib/styles/login-form.css';
	import { wakeUpApi } from '$lib/services/api';

	let {
		title,
		description,
		eyebrow,
		children
	}: { title: string; description: string; eyebrow?: string; children: Snippet } = $props();

	onMount(() => {
		wakeUpApi();
	});
</script>

<main class="auth-page">
	<div class="auth-art" style="background-image: url({backgroundImg});" aria-hidden="true"></div>
	<div class="auth-shade" aria-hidden="true"></div>
	<div class="auth-layout">
		<section class="auth-content" in:fly={transitions.panel}>
			<header class="auth-header">
				<div class="brand-lockup">
					<Route size={20} strokeWidth={2.3} aria-hidden="true" />
					<span>TrackRide</span>
				</div>
				<div class="auth-heading">
					{#if eyebrow}
						<p class="auth-eyebrow">{eyebrow}</p>
					{/if}
					<h1>{title}</h1>
					<p class="auth-description">{description}</p>
				</div>
			</header>
			{@render children()}
		</section>
	</div>
</main>
