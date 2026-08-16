<script lang="ts">
	import { ChevronDown, Sparkles } from 'lucide-svelte';
	import { slide } from 'svelte/transition';
	import { latestRelease } from '$lib/config/release';
	import { transitions } from '$lib/utils/transitions';
	import '$lib/styles/login-release.css';

	let open = $state(false);
	const notesId = 'latest-release-notes';
</script>

<div class="auth-release">
	<button
		type="button"
		class="auth-version-trigger"
		onclick={() => open = !open}
		aria-expanded={open}
		aria-controls={notesId}
	>
		<span>Versão {latestRelease.version}</span>
		<ChevronDown size={13} class={open ? 'open' : ''} />
	</button>

	{#if open}
		<section id={notesId} class="auth-release-notes" aria-label="Novidades da versão {latestRelease.version}" transition:slide={transitions.quick}>
			<header>
				<Sparkles size={15} aria-hidden="true" />
				<h2>Novidades da versão {latestRelease.version}</h2>
			</header>
			<ul>
				{#each latestRelease.notes as note}
					<li><span aria-hidden="true"></span><p>{note}</p></li>
				{/each}
			</ul>
		</section>
	{/if}
</div>
