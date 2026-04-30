import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import { type AuthUser, fetchMe, clearToken, isAuthenticated } from '$lib/services/auth';

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
			clearToken();
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
			user = null;
			goto('/login');
		}
	};
}
