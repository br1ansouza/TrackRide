<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fly } from 'svelte/transition';
	import { Route } from 'lucide-svelte';
	import { transitions } from '$lib/utils/transitions';
	import backgroundImg from '$lib/assets/background-trackride.png';
	import '$lib/styles/login-layout.css';
	import '$lib/styles/login-form.css';

	let { title, description, children }: { title: string; description: string; children: Snippet } = $props();
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
					<h1>{title}</h1>
					<p class="auth-description">{description}</p>
				</div>
			</header>
			{@render children()}
		</section>
	</div>
</main>
