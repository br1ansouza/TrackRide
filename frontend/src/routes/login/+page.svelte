<script lang="ts">
	import { goto } from '$app/navigation';
	import { Eye, EyeOff, LoaderCircle, LogIn } from 'lucide-svelte';
	import AuthShell from '$lib/components/AuthShell.svelte';
	import ReleaseNotes from '$lib/components/ReleaseNotes.svelte';
	import { login } from '$lib/services/auth';
	import { useAuth } from '$lib/stores/auth.svelte';
	import { toaster } from '$lib/stores/toaster';

	const auth = useAuth();

	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let submitting = $state(false);

	function destinationAfterLogin(): string {
		const candidate = new URLSearchParams(window.location.search).get('redirect');
		return candidate?.startsWith('/') && !candidate.startsWith('//') ? candidate : '/';
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!email || !password) return;
		submitting = true;
		try {
			const user = await login(email, password);
			auth.setUser(user);
			goto(destinationAfterLogin());
		} catch (e) {
			toaster.error({ title: 'Erro ao entrar', description: (e as Error).message });
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Entrar | TrackRide</title>
	<meta name="description" content="Entre no TrackRide para planejar rotas com clima e segurança ao longo do caminho." />
</svelte:head>

<AuthShell title="Bem-vindo de volta" description="Planeje rotas com clima e segurança ao longo do caminho.">
	<form onsubmit={handleSubmit} class="auth-form">
		<label for="login-email">Email</label>
		<input id="login-email" type="email" bind:value={email} placeholder="seu@email.com" autocomplete="email" inputmode="email" required class="auth-input" />

		<div class="password-heading">
			<label for="login-password">Senha</label>
			<a href="/forgot-password">Esqueci minha senha</a>
		</div>
		<div class="password-field">
			<input id="login-password" type={showPassword ? 'text' : 'password'} bind:value={password} placeholder="Sua senha" autocomplete="current-password" required class="auth-input" />
			<button type="button" class="password-toggle" onclick={() => showPassword = !showPassword} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
				{#if showPassword}<EyeOff size={19} />{:else}<Eye size={19} />{/if}
			</button>
		</div>

		<button type="submit" disabled={submitting || !email || !password} class="auth-primary-button" aria-busy={submitting}>
			{#if submitting}<LoaderCircle size={18} class="animate-spin" />{:else}<LogIn size={18} />{/if}
			{submitting ? 'Entrando…' : 'Entrar'}
		</button>
	</form>

	<div class="auth-meta">
		<p class="auth-footer">Ainda não tem conta? <a href="/register">Criar conta</a></p>
		<ReleaseNotes />
	</div>
</AuthShell>
