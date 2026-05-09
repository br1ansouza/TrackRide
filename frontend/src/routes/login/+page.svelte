<script lang="ts">
	import { goto } from '$app/navigation';
	import { LogIn } from 'lucide-svelte';
	import { fly } from 'svelte/transition';
	import { transitions } from '$lib/utils/transitions';
	import { login } from '$lib/services/auth';
	import { useAuth } from '$lib/stores/auth.svelte';
	import { toaster } from '$lib/stores/toaster';
	import backgroundImg from '$lib/assets/background-trackride.png';

	const auth = useAuth();

	let email = $state('');
	let password = $state('');
	let submitting = $state(false);

	async function handleSubmit() {
		if (!email || !password) return;
		submitting = true;
		try {
			const user = await login(email, password);
			auth.setUser(user);
			goto('/');
		} catch (e) {
			toaster.error({ title: 'Erro ao entrar', description: (e as Error).message });
		} finally {
			submitting = false;
		}
	}
</script>

<div class="relative flex h-dvh items-center justify-center overflow-hidden bg-surface-900 p-6">
	<div class="absolute inset-0 scale-110 bg-cover bg-center opacity-5" style="background-image: url({backgroundImg});"></div>
	<div class="relative flex w-full max-w-sm flex-col gap-6" in:fly={transitions.panel}>
		<div class="flex flex-col items-center gap-2">
			<h1 class="text-2xl font-bold text-white">TrackRide</h1>
			<p class="text-sm text-surface-400">Entre para planejar suas rotas</p>
		</div>

		<form onsubmit={handleSubmit} class="flex flex-col gap-4">
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
					placeholder="Sua senha"
					required
					class="input w-full rounded-md bg-surface-800 py-3 pl-3 pr-3 text-base text-white placeholder-surface-500"
				/>
			</div>

			<button
				type="submit"
				disabled={submitting || !email || !password}
				class="btn preset-filled-primary-500 flex items-center justify-center gap-2 rounded-lg py-3 text-base font-semibold disabled:opacity-40"
			>
				<LogIn size={18} />
				{submitting ? 'Entrando…' : 'Entrar'}
			</button>
		</form>

		<p class="text-center text-sm text-surface-400">
			Não tem conta?
			<a href="/register" class="font-medium" style="color: var(--color-ride-route-300);">Criar conta</a>
		</p>
		<p class="text-center text-sm text-surface-400">
			<a href="/forgot-password" class="font-medium" style="color: var(--color-ride-route-300);">Esqueci minha senha</a>
		</p>
	</div>
</div>
