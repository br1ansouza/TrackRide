<script lang="ts">
	import { goto } from '$app/navigation';
	import { Eye, EyeOff, LoaderCircle, UserPlus } from 'lucide-svelte';
	import AuthShell from '$lib/components/AuthShell.svelte';
	import { register } from '$lib/services/auth';
	import { useAuth } from '$lib/stores/auth.svelte';
	import { toaster } from '$lib/stores/toaster';

	const auth = useAuth();

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let passwordConfirmation = $state('');
	let legalConsent = $state(false);
	let showPasswords = $state(false);
	let submitting = $state(false);

	let passwordsMatch = $derived(password === passwordConfirmation);
	let canSubmit = $derived(Boolean(name && email && password && passwordConfirmation && passwordsMatch && legalConsent && !submitting));

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!canSubmit) return;
		submitting = true;
		try {
			const user = await register(name, email, password, passwordConfirmation);
			auth.setUser(user);
			goto('/');
		} catch (e) {
			toaster.error({ title: 'Erro ao criar conta', description: (e as Error).message });
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Criar conta | TrackRide</title>
	<meta name="description" content="Crie sua conta no TrackRide e comece a planejar rotas mais seguras." />
</svelte:head>

<AuthShell title="Comece sua próxima rota" description="Crie sua conta para salvar trajetos, preferências e mapas offline.">
	<form onsubmit={handleSubmit} class="auth-form">
		<label for="register-name">Nome</label>
		<input id="register-name" type="text" bind:value={name} placeholder="Seu nome" autocomplete="name" required class="auth-input" />

		<label for="register-email">Email</label>
		<input id="register-email" type="email" bind:value={email} placeholder="seu@email.com" autocomplete="email" inputmode="email" required class="auth-input" />

		<label for="register-password">Senha</label>
		<div class="password-field">
			<input id="register-password" type={showPasswords ? 'text' : 'password'} bind:value={password} placeholder="Mínimo 6 caracteres" autocomplete="new-password" minlength={6} required class="auth-input" />
			<button type="button" class="password-toggle" onclick={() => showPasswords = !showPasswords} aria-label={showPasswords ? 'Ocultar senhas' : 'Mostrar senhas'} title={showPasswords ? 'Ocultar senhas' : 'Mostrar senhas'}>
				{#if showPasswords}<EyeOff size={19} />{:else}<Eye size={19} />{/if}
			</button>
		</div>

		<label for="register-password-confirmation">Confirmar senha</label>
		<input id="register-password-confirmation" type={showPasswords ? 'text' : 'password'} bind:value={passwordConfirmation} placeholder="Repita a senha" autocomplete="new-password" required class="auth-input" aria-invalid={passwordConfirmation && !passwordsMatch ? 'true' : undefined} />
		{#if passwordConfirmation && !passwordsMatch}
			<span class="auth-error">As senhas não coincidem.</span>
		{/if}

		<label class="auth-consent">
			<input type="checkbox" bind:checked={legalConsent} required />
			<span>Li e aceito os <a href="/termos" target="_blank" rel="noreferrer">Termos de Uso</a> e a <a href="/privacidade" target="_blank" rel="noreferrer">Política de Privacidade</a>.</span>
		</label>

		<button type="submit" disabled={!canSubmit} class="auth-primary-button" aria-busy={submitting}>
			{#if submitting}<LoaderCircle size={18} class="animate-spin" />{:else}<UserPlus size={18} />{/if}
			{submitting ? 'Criando…' : 'Criar conta'}
		</button>
	</form>

	<p class="auth-footer">Já tem uma conta? <a href="/login">Entrar</a></p>
</AuthShell>
