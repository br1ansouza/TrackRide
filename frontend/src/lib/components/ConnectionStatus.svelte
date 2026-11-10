<script lang="ts">
	import { apiStatus } from '#lib/stores/apiStatus.svelte.js';
	import { useConnectivity } from '#lib/stores/connectivity.svelte.js';
	const connectivity = useConnectivity();
</script>

{#if apiStatus.state === 'waking' || apiStatus.state === 'unavailable' || apiStatus.state === 'offline'}
	<aside class="connection-status" aria-live="polite" aria-atomic="true">
		{#if apiStatus.state === 'offline'}
			<strong>Sem conexão com a internet</strong>
			<p>Você pode encerrar a viagem. O percurso será salvo no aparelho.</p>
		{:else if apiStatus.state === 'waking'}
			<strong>Ligando o servidor…</strong>
			<p>
				Usamos uma infraestrutura gratuita que entra em repouso quando fica sem uso. A primeira
				conexão pode demorar um pouco. Estamos tentando automaticamente.
			</p>
		{:else}
			<strong>Servidor indisponível no momento</strong>
			<p>
				A conexão com o servidor ainda não foi restabelecida. Seus percursos pendentes continuam
				salvos no aparelho.
			</p>
			<button type="button" onclick={() => connectivity.checkNow()}>Tentar novamente</button>
		{/if}
	</aside>
{/if}

<style>
	.connection-status {
		position: fixed;
		top: max(12px, env(safe-area-inset-top));
		left: 50%;
		transform: translateX(-50%);
		z-index: 1400;
		width: min(420px, calc(100% - 32px));
		padding: 14px 16px;
		border: 1px solid var(--color-surface-600);
		border-radius: 14px;
		background: var(--color-surface-900);
		color: var(--color-surface-100);
		box-shadow: 0 8px 32px #0005;
	}
	strong {
		font-size: 14px;
	}
	p {
		font-size: 12px;
		line-height: 1.5;
		margin-top: 4px;
		color: var(--color-surface-300);
	}
	button {
		margin-top: 8px;
		text-decoration: underline;
		font-size: 13px;
	}
</style>
