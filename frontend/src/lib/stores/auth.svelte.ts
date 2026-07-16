import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import { type AuthUser, fetchMe, clearToken, isAuthenticated, getCachedUser, clearCachedUser } from '$lib/services/auth';
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
		logout() {
			clearToken();
			clearCachedUser();
			user = null;
			goto('/login');
		}
	};
}
