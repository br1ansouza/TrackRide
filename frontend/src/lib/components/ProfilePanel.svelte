<script lang="ts">
	import { LogOut, ChevronRight, Bike } from 'lucide-svelte';
	import type { AuthUser } from '$lib/services/auth';
	import { updateProfile } from '$lib/services/auth';
	import { toaster } from '$lib/stores/toaster';
	import backgroundImg from '$lib/assets/background-trackride.png';

	interface Props {
		user: AuthUser;
		onLogout: () => void;
		onUserUpdate: (user: AuthUser) => void;
		onViewAllRoutes?: () => void;
		compact?: boolean;
	}

	let { user, onLogout, onUserUpdate, onViewAllRoutes, compact = false }: Props = $props();

	let editingPreference = $state(false);

	const PREFERENCES = [
		{ value: 'calm', label: 'Tranquilo', description: 'Prefere rotas calmas e seguras' },
		{ value: 'mixed', label: 'Misto', description: 'Equilíbrio entre conforto e aventura' },
		{ value: 'sport', label: 'Esportivo', description: 'Busca emoção e desafio' }
	] as const;

	async function selectPreference(value: string) {
		try {
			const updated = await updateProfile({ riding_preference: value });
			onUserUpdate(updated);
			editingPreference = false;
			toaster.success({ title: 'Preferência atualizada', description: `Modo ${PREFERENCES.find(p => p.value === value)?.label}` });
		} catch {
			toaster.error({ title: 'Erro', description: 'Não foi possível atualizar a preferência.' });
		}
	}
</script>

<div class="relative flex flex-col gap-4 {compact ? '' : 'h-full overflow-y-auto bg-surface-800 p-5 pb-20'}">
	{#if !compact}
		<div class="absolute inset-0 scale-110 bg-cover bg-center opacity-5" style="background-image: url({backgroundImg});"></div>
	{/if}
	<div class="relative flex flex-col gap-4">
	{#if !compact}
		<div class="flex flex-col items-center gap-2 py-4">
			<div class="flex h-16 w-16 items-center justify-center rounded-full" style="background-color: var(--color-ride-alert-500);">
				<span class="text-2xl font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
			</div>
			<h2 class="text-lg font-semibold text-white">{user.name}</h2>
			<p class="text-sm text-surface-400">{user.email}</p>
		</div>
	{/if}

	<div class="flex flex-col gap-2">
		<span class="text-xs font-medium text-surface-400">Preferência de pilotagem</span>
		{#if editingPreference}
			<div class="flex flex-col gap-2">
				{#each PREFERENCES as pref}
					<button
						type="button"
						onclick={() => selectPreference(pref.value)}
						class="flex flex-col gap-0.5 rounded-lg p-3 text-left transition-colors {user.riding_preference === pref.value ? 'bg-surface-600' : 'bg-surface-700 hover:bg-surface-600'}"
					>
						<span class="text-sm font-medium text-white">{pref.label}</span>
						<span class="text-xs text-surface-400">{pref.description}</span>
					</button>
				{/each}
			</div>
		{:else}
			<button
				type="button"
				onclick={() => editingPreference = true}
				class="flex items-center justify-between rounded-lg bg-surface-700 p-3"
			>
				<div class="flex items-center gap-2">
					<Bike size={16} class="text-surface-400" />
					<span class="text-sm text-white">{PREFERENCES.find(p => p.value === user.riding_preference)?.label}</span>
				</div>
				<ChevronRight size={16} class="text-surface-500" />
			</button>
		{/if}
	</div>

	<hr class="border-surface-700" />

	<button
		type="button"
		onclick={onViewAllRoutes}
		class="flex items-center justify-between rounded-lg bg-surface-700 p-3"
	>
		<span class="text-sm text-white">Histórico de viagens</span>
		<ChevronRight size={16} class="text-surface-500" />
	</button>

	<div class="{compact ? 'pt-2' : 'mt-auto'}">
		<button
			type="button"
			onclick={onLogout}
			class="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium"
			style="color: var(--color-ride-danger-300);"
		>
			<LogOut size={16} />
			Sair da conta
		</button>
	</div>
</div>
</div>
