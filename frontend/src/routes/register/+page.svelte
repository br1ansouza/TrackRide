<script lang="ts">
	import { goto } from '$app/navigation';
	import { UserPlus } from 'lucide-svelte';
	import { register } from '$lib/services/auth';
	import { useAuth } from '$lib/stores/auth.svelte';
	import { toaster } from '$lib/stores/toaster';
	import backgroundImg from '$lib/assets/background-trackride.png';

	const auth = useAuth();

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let passwordConfirmation = $state('');
	let submitting = $state(false);

	let passwordsMatch = $derived(password === passwordConfirmation);
	let canSubmit = $derived(name && email && password && passwordConfirmation && passwordsMatch && !submitting);

	async function handleSubmit() {
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

<div class="relative flex h-dvh items-center justify-center overflow-hidden bg-surface-900 p-6">
	<div class="absolute inset-0 scale-110 bg-cover bg-center opacity-5" style="background-image: url({backgroundImg});"></div>
	<div class="relative flex w-full max-w-sm flex-col gap-6">
		<div class="flex flex-col items-center gap-2">
			<h1 class="text-2xl font-bold text-white">TrackRide</h1>
			<p class="text-sm text-surface-400">Crie sua conta para começar</p>
		</div>

		<form onsubmit={handleSubmit} class="flex flex-col gap-4">
			<div class="flex flex-col gap-1">
				<span class="text-xs font-medium text-surface-400">Nome</span>
				<input
					type="text"
					bind:value={name}
					placeholder="Seu nome"
					required
					class="input w-full rounded-md bg-surface-800 py-3 pl-3 pr-3 text-base text-white placeholder-surface-500"
				/>
			</div>

			<div class="flex flex-col gap-1">
				<span class="text-xs font-medium text-surface-400">Email</span>
				<input
					type="email"
					bind:value={email}
					placeholder="seu@email.com"
					required
					class="input w-full rounded-md bg-surface-800 py-3 pl-3 pr-3 text-base text-white placeholder-surface-500"
				/>
			</div>

			<div class="flex flex-col gap-1">
				<span class="text-xs font-medium text-surface-400">Senha</span>
				<input
					type="password"
					bind:value={password}
					placeholder="Mínimo 6 caracteres"
					required
					minlength={6}
					class="input w-full rounded-md bg-surface-800 py-3 pl-3 pr-3 text-base text-white placeholder-surface-500"
				/>
			</div>

			<div class="flex flex-col gap-1">
				<span class="text-xs font-medium text-surface-400">Confirmar senha</span>
				<input
					type="password"
					bind:value={passwordConfirmation}
					placeholder="Repita a senha"
					required
					class="input w-full rounded-md bg-surface-800 py-3 pl-3 pr-3 text-base text-white placeholder-surface-500"
					class:border-error-500={passwordConfirmation && !passwordsMatch}
				/>
				{#if passwordConfirmation && !passwordsMatch}
					<span class="text-xs" style="color: var(--color-ride-danger-300);">Senhas não coincidem</span>
				{/if}
			</div>

			<button
				type="submit"
				disabled={!canSubmit}
				class="btn preset-filled-primary-500 flex items-center justify-center gap-2 rounded-lg py-3 text-base font-semibold disabled:opacity-40"
			>
				<UserPlus size={18} />
				{submitting ? 'Criando…' : 'Criar conta'}
			</button>
		</form>

		<p class="text-center text-sm text-surface-400">
			Já tem conta?
			<a href="/login" class="font-medium" style="color: var(--color-ride-route-300);">Entrar</a>
		</p>
	</div>
</div>
