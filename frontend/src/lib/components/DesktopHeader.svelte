<script lang="ts">
	import SearchInput from '$lib/components/SearchInput.svelte';
	import ProfilePanel from '$lib/components/ProfilePanel.svelte';
	import type { AuthUser } from '$lib/services/auth';
	import type { LatLng } from '$lib/services/routing';

	interface Props {
		user: AuthUser;
		profileOpen: boolean;
		onOriginSelect: (label: string, coords: LatLng) => void;
		onDestSelect: (label: string, coords: LatLng) => void;
		onSearch: () => void;
		onProfileToggle: () => void;
		onLogout: () => void;
		onUserUpdate: (user: AuthUser) => void;
		onViewAllRoutes: () => void;
	}

	let { user, profileOpen, onOriginSelect, onDestSelect, onSearch, onProfileToggle, onLogout, onUserUpdate, onViewAllRoutes }: Props = $props();
</script>

<header class="flex items-center gap-4 bg-surface-900 p-4">
	<h1 class="text-xl font-bold text-white">TrackRide</h1>
	<div class="flex flex-1 items-center gap-2">
		<SearchInput placeholder="Origem" showMyLocation onselect={onOriginSelect} />
		<SearchInput placeholder="Destino" onselect={onDestSelect} />
		<button onclick={onSearch} class="btn preset-filled-primary-500 rounded-md px-4 py-2 text-sm">Buscar rota</button>
	</div>
	<div class="relative">
		<button
			onclick={onProfileToggle}
			class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
			style="background-color: var(--color-ride-alert-500);"
		>
			{user.name.charAt(0).toUpperCase()}
		</button>
		{#if profileOpen}
			<div class="absolute right-0 top-10 z-[1000] w-72 overflow-y-auto rounded-xl border border-surface-700 bg-surface-900 p-4 shadow-xl" style="max-height: 80vh;">
				<div class="flex flex-col gap-3">
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white" style="background-color: var(--color-ride-alert-500);">
							{user.name.charAt(0).toUpperCase()}
						</div>
						<div>
							<p class="text-sm font-semibold text-white">{user.name}</p>
							<p class="text-xs text-surface-400">{user.email}</p>
						</div>
					</div>
					<hr class="border-surface-700" />
					<ProfilePanel {user} {onLogout} {onUserUpdate} onViewAllRoutes={onViewAllRoutes} compact />
				</div>
			</div>
		{/if}
	</div>
</header>
