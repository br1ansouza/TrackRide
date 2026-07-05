<script lang="ts">
	import { Leaf, Bike, Zap } from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	import { transitions } from '$lib/utils/transitions';
	import { updateProfile, type AuthUser } from '$lib/services/auth';
	import { toaster } from '$lib/stores/toaster';
	import { vibrate } from '$lib/utils/haptics';

	interface Props {
		user: AuthUser;
		onUserUpdate: (user: AuthUser) => void;
	}

	let { user, onUserUpdate }: Props = $props();

	let saving = $state(false);

	const PREFERENCES = [
		{ value: 'calm', label: 'Tranquilo', description: 'Prefere rotas calmas e seguras', icon: Leaf, color: '--color-ride-safe-300' },
		{ value: 'mixed', label: 'Misto', description: 'Equilíbrio entre conforto e aventura', icon: Bike, color: '--color-ride-route-300' },
		{ value: 'sport', label: 'Esportivo', description: 'Busca emoção e desafio', icon: Zap, color: '--color-ride-danger-300' }
	] as const;

	let selected = $derived(PREFERENCES.find((p) => p.value === user.riding_preference) ?? PREFERENCES[1]);

	async function select(value: AuthUser['riding_preference']) {
		if (saving || value === user.riding_preference) return;
		vibrate();
		saving = true;
		try {
			onUserUpdate(await updateProfile({ riding_preference: value }));
		} catch {
			toaster.error({ title: 'Erro', description: 'Não foi possível atualizar a preferência.' });
		} finally {
			saving = false;
		}
	}
</script>

<div class="flex flex-col gap-2">
	<span class="text-xs font-medium text-surface-400">Preferência de pilotagem</span>
	<div class="flex flex-col gap-2 rounded-xl bg-surface-700 p-2">
		<div class="flex gap-1 rounded-lg bg-surface-800/70 p-1">
			{#each PREFERENCES as pref}
				{@const Icon = pref.icon}
				{@const active = user.riding_preference === pref.value}
				<button
					type="button"
					onclick={() => select(pref.value)}
					disabled={saving}
					class="flex flex-1 flex-col items-center gap-1 rounded-md py-2.5 transition-colors {active ? 'bg-surface-600 shadow-sm' : 'hover:bg-surface-700'}"
				>
					<Icon size={18} style="color: var({active ? pref.color : '--color-surface-400'});" />
					<span class="text-[11px] font-medium leading-none {active ? 'text-white' : 'text-surface-400'}">{pref.label}</span>
				</button>
			{/each}
		</div>
		{#key selected.value}
			<p class="pb-1 text-center text-xs text-surface-400" in:fade={transitions.quick}>{selected.description}</p>
		{/key}
	</div>
</div>
