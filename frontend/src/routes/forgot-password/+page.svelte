<script lang="ts">
	import { LoaderCircle, Mail } from 'lucide-svelte';
	import AuthShell from '$lib/components/AuthShell.svelte';
	import { forgotPassword } from '$lib/services/auth';
	import { toaster } from '$lib/stores/toaster';

	let email = $state('');
	let submitting = $state(false);
	let sent = $state(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!email) return;
		submitting = true;
		try {
			await forgotPassword(email);
			sent = true;
		} catch (e) {
			toaster.error({ title: 'Erro', description: (e as Error).message });
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Recuperar senha | TrackRide</title>
</svelte:head>

<AuthShell
	title={sent ? 'Confira seu email' : 'Recupere o acesso'}
	description={sent ? 'Enviamos as próximas instruções para o endereço informado.' : 'Informe seu email para receber um link seguro de redefinição.'}
>
	{#if sent}
		<div class="auth-feedback">
			<Mail size={20} />
			<p>Se o email estiver cadastrado, você receberá um link para criar uma nova senha.</p>
		</div>
	{:else}
		<form onsubmit={handleSubmit} class="auth-form">
			<label for="forgot-email">Email</label>
			<input id="forgot-email" type="email" bind:value={email} placeholder="seu@email.com" autocomplete="email" inputmode="email" required class="auth-input" />
			<button type="submit" disabled={submitting || !email} class="auth-primary-button" aria-busy={submitting}>
				{#if submitting}<LoaderCircle size={18} class="animate-spin" />{:else}<Mail size={18} />{/if}
				{submitting ? 'Enviando…' : 'Enviar link'}
			</button>
		</form>
	{/if}

	<p class="auth-footer">Lembrou sua senha? <a href="/login">Voltar ao login</a></p>
</AuthShell>
