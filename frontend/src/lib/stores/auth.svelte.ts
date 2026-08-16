import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import { type AuthUser, fetchMe, clearToken, isAuthenticated, getCachedUser, clearCachedUser, deleteAccount as deleteAccountRequest } from '$lib/services/auth';
import { clearOfflineUserData } from '$lib/services/offlinePack';
import { useConnectivity } from '$lib/stores/connectivity.svelte';

let user = $state<AuthUser | null>(null);
let loading = $state(true);

export function useAuth() {
	onMount(async () => {
		if (!isAuthenticated()) {
			loading = false;
			return;
		}
		try {
			user = await fetchMe();
		} catch {
			if (isAuthenticated()) {
				user = getCachedUser();
				useConnectivity().markOffline();
			}
		} finally {
			loading = false;
		}
	});

	return {
		get user() { return user; },
		get loading() { return loading; },
		get isLoggedIn() { return !!user; },
		setUser(u: AuthUser) { user = u; },
		async deleteAccount(password: string) {
			await deleteAccountRequest(password);
			clearToken();
			clearCachedUser();
			await clearOfflineUserData();
			user = null;
			goto('/login?conta_excluida=1');
		},
		logout() {
			clearToken();
			clearCachedUser();
			clearOfflineUserData();
			user = null;
			goto('/login');
		}
	};
}
