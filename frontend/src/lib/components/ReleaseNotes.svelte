<script lang="ts">
	import { latestRelease } from '$lib/config/release';
	import '$lib/styles/login-release.css';

	let open = $state(false);
	const tooltipId = 'release-tooltip';
</script>

<div class="auth-version" class:open>
	<button
		type="button"
		aria-describedby={tooltipId}
		onclick={() => (open = !open)}
		onblur={() => (open = false)}
	>
		v{latestRelease.version}
	</button>

	<div id={tooltipId} role="tooltip" class="auth-version-tooltip">
		{#each latestRelease.notes as note}
			<span>{note}</span>
		{/each}
	</div>
</div>
