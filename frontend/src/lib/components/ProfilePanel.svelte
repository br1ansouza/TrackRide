<script lang="ts">
	import { LogOut, ChevronRight } from 'lucide-svelte';
	import type { AuthUser } from '$lib/services/auth';
	import PreferenceSelector from '$lib/components/PreferenceSelector.svelte';
	import FuelRangeEditor from '$lib/components/FuelRangeEditor.svelte';
	import { vibrate } from '$lib/utils/haptics';
	import backgroundImg from '$lib/assets/background-trackride.png';

	interface Props {
		user: AuthUser;
		onLogout: () => void;
		onUserUpdate: (user: AuthUser) => void;
		onViewAllRoutes?: () => void;
		compact?: boolean;
	}

	let { user, onLogout, onUserUpdate, onViewAllRoutes, compact = false }: Props = $props();
</script>

<div class="relative flex flex-col gap-4 {compact ? '' : 'h-full overflow-y-auto bg-surface-800 p-5 pb-20 pt-[calc(20px+env(safe-area-inset-top))]'}">
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

	<PreferenceSelector {user} {onUserUpdate} />

	<FuelRangeEditor {user} {onUserUpdate} />

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
			onclick={() => { vibrate(); onLogout(); }}
			class="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium"
			style="color: var(--color-ride-danger-300);"
		>
			<LogOut size={16} />
			Sair da conta
		</button>
	</div>
</div>
</div>
