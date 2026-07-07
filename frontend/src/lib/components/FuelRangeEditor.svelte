<script lang="ts">
	import { Fuel, Minus, Plus, ChevronRight } from 'lucide-svelte';
	import { slide } from 'svelte/transition';
	import { transitions } from '$lib/utils/transitions';
	import { updateProfile, type AuthUser } from '$lib/services/auth';
	import { toaster } from '$lib/stores/toaster';
	import { vibrate } from '$lib/utils/haptics';

	interface Props {
		user: AuthUser;
		onUserUpdate: (user: AuthUser) => void;
	}

	let { user, onUserUpdate }: Props = $props();

	const RANGE_MIN = 30;
	const RANGE_MAX = 1000;
	const RANGE_STEP = 10;

	let editing = $state(false);
	let rangeInput = $state(200);
	let saving = $state(false);

	let dirty = $derived(rangeInput !== (user.fuel_range_km ?? 0));

	function clampRange(value: number): number {
		return Math.max(RANGE_MIN, Math.min(RANGE_MAX, Math.round(value || 0)));
	}

	function openEditor() {
		vibrate();
		rangeInput = user.fuel_range_km ?? 200;
		editing = true;
	}

	function nudge(delta: number) {
		vibrate();
		rangeInput = clampRange(rangeInput + delta);
	}

	async function save() {
		if (saving || !dirty) return;
		rangeInput = clampRange(rangeInput);
		vibrate();
		saving = true;
		try {
			onUserUpdate(await updateProfile({ fuel_range_km: rangeInput }));
			editing = false;
			toaster.success({ title: 'Autonomia atualizada', description: `Postos sugeridos a cada ${rangeInput} km.` });
		} catch {
			toaster.error({ title: 'Erro', description: 'Não foi possível salvar a autonomia.' });
		} finally {
			saving = false;
		}
	}
</script>

<div class="flex flex-col gap-2">
	<span class="text-xs font-medium text-surface-400">Autonomia da moto</span>
	{#if editing}
		<div class="flex flex-col gap-3 rounded-xl bg-surface-700 p-4" transition:slide={transitions.quick}>
			<div class="flex items-center justify-center gap-4">
				<button
					type="button"
					onclick={() => nudge(-RANGE_STEP)}
					disabled={saving}
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-800 text-surface-300 transition-colors hover:text-white active:bg-surface-600"
				>
					<Minus size={18} />
				</button>
				<div class="flex items-baseline gap-1.5">
					<input
						type="number"
						bind:value={rangeInput}
						min={RANGE_MIN}
						max={RANGE_MAX}
						disabled={saving}
						class="w-24 bg-transparent text-center text-4xl font-bold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
					/>
					<span class="text-sm font-medium text-surface-400">km</span>
				</div>
				<button
					type="button"
					onclick={() => nudge(RANGE_STEP)}
					disabled={saving}
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-800 text-surface-300 transition-colors hover:text-white active:bg-surface-600"
				>
					<Plus size={18} />
				</button>
			</div>
			<p class="text-center text-xs text-surface-500">Distância que a moto roda com um tanque cheio</p>
			<div class="flex gap-2">
				<button
					type="button"
					onclick={() => editing = false}
					disabled={saving}
					class="flex-1 rounded-lg bg-surface-800 py-2.5 text-xs font-medium text-surface-400 transition-colors hover:text-surface-200"
				>
					Cancelar
				</button>
				<button
					type="button"
					onclick={save}
					disabled={saving || !dirty}
					class="flex-1 rounded-lg py-2.5 text-xs font-semibold text-white transition-opacity disabled:opacity-40"
					style="background-color: var(--color-ride-alert-500);"
				>
					{saving ? 'Salvando…' : 'Salvar'}
				</button>
			</div>
		</div>
	{:else}
		<button
			type="button"
			onclick={openEditor}
			class="flex items-center gap-3 rounded-xl bg-surface-700 p-3 text-left transition-colors hover:bg-surface-600"
		>
			<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style="background-color: var(--color-ride-alert-900);">
				<Fuel size={20} style="color: var(--color-ride-alert-300);" />
			</div>
			<div class="flex flex-1 flex-col gap-0.5">
				{#if user.fuel_range_km}
					<span class="text-sm font-semibold text-white">{user.fuel_range_km} km</span>
					<span class="text-xs text-surface-400">com um tanque cheio</span>
				{:else}
					<span class="text-sm font-medium text-white">Definir autonomia</span>
					<span class="text-xs text-surface-400">para sugerir paradas em postos</span>
				{/if}
			</div>
			<ChevronRight size={16} class="text-surface-500" />
		</button>
	{/if}
</div>
