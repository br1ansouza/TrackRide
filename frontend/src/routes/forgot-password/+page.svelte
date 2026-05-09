<script lang="ts">
	import { Mail } from 'lucide-svelte';
	import { fly } from 'svelte/transition';
	import { transitions } from '$lib/utils/transitions';
	import { forgotPassword } from '$lib/services/auth';
	import { toaster } from '$lib/stores/toaster';
	import backgroundImg from '$lib/assets/background-trackride.png';

	let email = $state('');
	let submitting = $state(false);
	let sent = $state(false);

	async function handleSubmit() {
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

<div class="relative flex h-dvh items-center justify-center overflow-hidden bg-surface-900 p-6">
	<div class="absolute inset-0 scale-110 bg-cover bg-center opacity-5" style="background-image: url({backgroundImg});"></div>
	<div class="relative flex w-full max-w-sm flex-col gap-6" in:fly={transitions.panel}>
		<div class="flex flex-col items-center gap-2">
			<h1 class="text-2xl font-bold text-white">Recuperar senha</h1>
			<p class="text-sm text-surface-400">
				{sent ? 'Verifique sua caixa de entrada' : 'Informe seu email para redefinir'}
			</p>
		</div>

		{#if sent}
			<div class="flex flex-col items-center gap-3 rounded-lg bg-surface-800 p-6">
				<Mail size={32} class="text-surface-300" />
				<p class="text-center text-sm text-surface-300">
					Se o email estiver cadastrado, você receberá um link para criar uma nova senha.
				</p>
			</div>
		{:else}
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

				<button
					type="submit"
					disabled={submitting || !email}
					class="btn preset-filled-primary-500 flex items-center justify-center gap-2 rounded-lg py-3 text-base font-semibold disabled:opacity-40"
				>
					<Mail size={18} />
					{submitting ? 'Enviando…' : 'Enviar link'}
				</button>
			</form>
		{/if}

		<p class="text-center text-sm text-surface-400">
			<a href="/login" class="font-medium" style="color: var(--color-ride-route-300);">Voltar ao login</a>
		</p>
	</div>
</div>
