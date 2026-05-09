<script lang="ts">
	import { goto } from '$app/navigation';
	import { KeyRound } from 'lucide-svelte';
	import { fly } from 'svelte/transition';
	import { transitions } from '$lib/utils/transitions';
	import { resetPassword } from '$lib/services/auth';
	import { toaster } from '$lib/stores/toaster';
	import backgroundImg from '$lib/assets/background-trackride.png';

	let { data }: { data: { token: string } } = $props();
	const token = data.token;

	let password = $state('');
	let passwordConfirmation = $state('');
	let submitting = $state(false);

	async function handleSubmit() {
		if (!password || !passwordConfirmation) return;
		if (password !== passwordConfirmation) {
			toaster.error({ title: 'Erro', description: 'As senhas não coincidem' });
			return;
		}
		submitting = true;
		try {
			await resetPassword(token, password, passwordConfirmation);
			toaster.success({ title: 'Senha redefinida', description: 'Faça login com sua nova senha' });
			goto('/login');
		} catch (e) {
			toaster.error({ title: 'Erro', description: (e as Error).message });
		} finally {
			submitting = false;
		}
	}
</script>

<div class="relative flex h-dvh items-center justify-center overflow-hidden bg-surface-900 p-6">
	<div class="absolute inset-0 scale-110 bg-cover bg-center opacity-5" style="background-image: url({backgroundImg});"></div>
	<div class="relative flex w-full max-w-sm flex-col gap-6" in:fly={transitions.panel}>
		<div class="flex flex-col items-center gap-2">
			<h1 class="text-2xl font-bold text-white">Nova senha</h1>
			<p class="text-sm text-surface-400">Crie uma nova senha para sua conta</p>
		</div>

		{#if !token}
			<div class="flex flex-col items-center gap-3 rounded-lg bg-surface-800 p-6">
				<p class="text-center text-sm text-surface-300">Link inválido. Solicite um novo link de recuperação.</p>
			</div>
		{:else}
			<form onsubmit={handleSubmit} class="flex flex-col gap-4">
				<div class="flex flex-col gap-1">
					<span class="text-xs font-medium text-surface-400">Nova senha</span>
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
						minlength={6}
						class="input w-full rounded-md bg-surface-800 py-3 pl-3 pr-3 text-base text-white placeholder-surface-500"
					/>
				</div>

				<button
					type="submit"
					disabled={submitting || !password || !passwordConfirmation}
					class="btn preset-filled-primary-500 flex items-center justify-center gap-2 rounded-lg py-3 text-base font-semibold disabled:opacity-40"
				>
					<KeyRound size={18} />
					{submitting ? 'Salvando…' : 'Redefinir senha'}
				</button>
			</form>
		{/if}

		<p class="text-center text-sm text-surface-400">
			<a href="/login" class="font-medium" style="color: var(--color-ride-route-300);">Voltar ao login</a>
		</p>
	</div>
</div>
