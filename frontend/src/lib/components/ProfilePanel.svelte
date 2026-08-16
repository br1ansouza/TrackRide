<script lang="ts">
	import { History, LogOut, ChevronRight } from 'lucide-svelte';
	import type { AuthUser } from '$lib/services/auth';
	import PreferenceSelector from '$lib/components/PreferenceSelector.svelte';
	import FuelRangeEditor from '$lib/components/FuelRangeEditor.svelte';
	import OfflineMapToggle from '$lib/components/OfflineMapToggle.svelte';
	import { vibrate } from '$lib/utils/haptics';
	import backgroundImg from '$lib/assets/background-trackride.png';
	import '$lib/styles/profile-mobile.css';
	import '$lib/styles/profile-mobile-controls.css';

	interface Props {
		user: AuthUser;
		onLogout: () => void;
		onUserUpdate: (user: AuthUser) => void;
		onViewAllRoutes?: () => void;
		compact?: boolean;
	}

	let { user, onLogout, onUserUpdate, onViewAllRoutes, compact = false }: Props = $props();
</script>

<div class={compact ? 'relative' : 'profile-page'}>
	{#if !compact}
		<div class="profile-art" style="background-image: url({backgroundImg});" aria-hidden="true"></div>
		<div class="profile-shade" aria-hidden="true"></div>
	{/if}
	<div class={compact ? 'relative flex flex-col gap-4' : 'profile-scroll'}>
	{#if !compact}
		<header class="profile-header">
			<div class="profile-identity">
				<div class="profile-avatar" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</div>
				<div>
					<h2>{user.name}</h2>
					<p>{user.email}</p>
				</div>
			</div>
		</header>
	{/if}

	{#if compact}
		<div class="contents">
			<PreferenceSelector {user} {onUserUpdate} />
			<FuelRangeEditor {user} {onUserUpdate} />
			<OfflineMapToggle />
		</div>
	{:else}
		<section class="profile-section">
			<div class="profile-section-heading">
				<h3>Sua pilotagem</h3>
				<p>Ajuste como o TrackRide planeja suas viagens</p>
			</div>
			<div class="profile-settings">
				<PreferenceSelector {user} {onUserUpdate} />
				<FuelRangeEditor {user} {onUserUpdate} />
				<OfflineMapToggle />
			</div>
		</section>
	{/if}

	{#if compact}<hr class="border-surface-700" />{/if}

	{#if compact}
		<button
			type="button"
			onclick={onViewAllRoutes}
			class="flex items-center justify-between rounded-lg bg-surface-700 p-3"
		>
			<span class="text-sm text-white">Histórico de viagens</span>
			<ChevronRight size={16} class="text-surface-500" />
		</button>
		<div class="pt-2">
			<button type="button" onclick={() => { vibrate(); onLogout(); }} class="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium" style="color: var(--color-ride-danger-300);">
				<LogOut size={16} />
				Sair da conta
			</button>
		</div>
	{:else}
		<section class="profile-section">
			<div class="profile-section-heading">
				<h3>Conta</h3>
			</div>
			<div class="profile-actions">
				<button type="button" onclick={onViewAllRoutes} class="profile-action">
					<span class="profile-action-icon"><History size={18} /></span>
					<span class="profile-action-copy"><strong>Histórico de viagens</strong><small>Reveja suas rotas salvas</small></span>
					<ChevronRight size={17} class="text-surface-500" />
				</button>
				<button type="button" onclick={() => { vibrate(); onLogout(); }} class="profile-action profile-logout">
					<span class="profile-action-icon"><LogOut size={18} /></span>
					<span class="profile-action-copy"><strong>Sair da conta</strong><small>Encerrar sessão neste dispositivo</small></span>
				</button>
			</div>
		</section>
	{/if}
</div>
</div>
