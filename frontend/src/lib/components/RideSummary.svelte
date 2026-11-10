<script lang="ts">
	import type { CreateRouteParams } from '#lib/services/routes.js';
	let {
		ride,
		status,
		onClose,
		onRetry
	}: {
		ride: CreateRouteParams;
		status: 'saving' | 'local' | 'synced' | 'failed';
		onClose: () => void;
		onRetry: () => void;
	} = $props();
	let dialog: HTMLDialogElement;
	$effect(() => {
		dialog?.showModal();
	});
</script>

<dialog
	bind:this={dialog}
	oncancel={(event) => {
		event.preventDefault();
		if (status !== 'failed' && status !== 'saving') onClose();
	}}
	aria-labelledby="ride-summary-title"
>
	<h2 id="ride-summary-title">Viagem encerrada</h2>
	<p class="route">{ride.origin_name} → {ride.destination_name}</p>
	<div class="metrics">
		<span><strong>{ride.distance_km ?? 0}</strong> km</span><span
			><strong>{ride.duration_minutes ?? 0}</strong> min</span
		>
	</div>
	<p>
		{ride.completed
			? 'Chegada ao destino registrada.'
			: 'Percurso registrado até o ponto de encerramento.'}
	</p>
	<div class="status" role="status">
		{#if status === 'saving'}Salvando no aparelho…
		{:else if status === 'synced'}Salvo e sincronizado com sua conta.
		{:else if status === 'local'}Salvo no aparelho · aguardando sincronização. Você já pode fechar
			este resumo.
		{:else}Não foi possível salvar no aparelho. Mantenha este resumo aberto e tente novamente para
			preservar o percurso.
		{/if}
	</div>
	{#if status === 'failed'}<button onclick={onRetry}>Tentar salvar novamente</button>
	{:else}<button disabled={status === 'saving'} onclick={onClose}>Fechar resumo</button>{/if}
</dialog>

<style>
	dialog {
		position: fixed;
		inset: 0;
		margin: auto;
		width: min(440px, calc(100% - 32px));
		max-height: 85dvh;
		overflow: auto;
		border: 1px solid var(--color-surface-600);
		border-radius: 20px;
		padding: 24px;
		background: var(--color-surface-900);
		color: var(--color-surface-100);
	}
	dialog::backdrop {
		background: #000a;
	}
	h2 {
		font-size: 23px;
		font-weight: 700;
	}
	p {
		margin-top: 12px;
		font-size: 14px;
		line-height: 1.5;
		color: var(--color-surface-300);
	}
	.metrics {
		display: flex;
		gap: 32px;
		margin: 24px 0;
	}
	strong {
		font-size: 30px;
	}
	.status {
		padding: 14px;
		margin: 20px 0;
		border-radius: 12px;
		background: var(--color-surface-800);
		font-size: 14px;
	}
	button {
		width: 100%;
		padding: 12px;
		border-radius: 12px;
		background: var(--color-ride-route-500);
		color: white;
		font-weight: 600;
	}
	button:disabled {
		opacity: 0.5;
	}
</style>
