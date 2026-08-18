<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { House, RefreshCw, WifiOff } from 'lucide-svelte';
	import AuthShell from '$lib/components/AuthShell.svelte';
	import { copyForStatus, OFFLINE_COPY } from '$lib/utils/errorCopy';
	import '$lib/styles/error-page.css';

	let offline = $state(false);

	$effect(() => {
		const sync = () => (offline = !navigator.onLine);
		sync();
		window.addEventListener('online', sync);
		window.addEventListener('offline', sync);
		return () => {
			window.removeEventListener('online', sync);
			window.removeEventListener('offline', sync);
		};
	});

	const copy = $derived(offline ? OFFLINE_COPY : copyForStatus(page.status));
	const detail = $derived(page.error?.message ?? '');
	const showDetail = $derived(!offline && !!detail && detail !== 'Not Found' && page.status !== 404);

	function retry() {
		location.reload();
	}
</script>

<svelte:head>
	<title>{copy.title} · TrackRide</title>
</svelte:head>

<AuthShell eyebrow={copy.eyebrow} title={copy.title} description={copy.description}>
	{#if showDetail}
		<p class="error-detail">{detail}</p>
	{/if}
	<div class="error-actions">
		{#if copy.retryable}
			<button type="button" class="auth-secondary-button" onclick={retry}>
				{#if offline}
					<WifiOff size={17} aria-hidden="true" />
				{:else}
					<RefreshCw size={17} aria-hidden="true" />
				{/if}
				Tentar de novo
			</button>
		{/if}
		<button type="button" class="auth-primary-button" onclick={() => goto('/')}>
			<House size={17} aria-hidden="true" />
			Voltar ao início
		</button>
	</div>
	<p class="auth-footer">
		Se o problema continuar, fale com <a href="mailto:trackride.app@gmail.com">trackride.app@gmail.com</a>.
	</p>
</AuthShell>
