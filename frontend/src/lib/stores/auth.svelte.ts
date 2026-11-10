import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import {
	type AuthUser,
	fetchMe,
	clearToken,
	getCachedUser,
	clearCachedUser,
	deleteAccount as deleteAccountRequest
} from '$lib/services/auth';
import { clearOfflineUserData } from '$lib/services/offlinePack';
import { isTemporaryError, getToken } from '$lib/services/api';

let user = $state<AuthUser | null>(null);
let loading = $state(true);

let initialization: Promise<void> | null = null;
let initializedToken: string | null = null;

async function initialize() {
	const token = getToken();
	if (!token) {
		user = null;
		loading = false;
		return;
	}
	if (initialization) return initialization;
	if (initializedToken === token && user) return;
	initialization = (async () => {
		const cached = getCachedUser();
		if (cached) {
			user = cached;
			loading = false;
		}
		try {
			const fresh = await fetchMe();
			if (getToken() === token) {
				user = fresh;
				initializedToken = token;
			}
		} catch (error) {
			if (!isTemporaryError(error)) user = null;
		} finally {
			loading = false;
			initialization = null;
		}
	})();
	return initialization;
}

export function useAuth() {
	onMount(() => {
		void initialize();
	});

	return {
		get user() {
			return user;
		},
		get loading() {
			return loading;
		},
		get isLoggedIn() {
			return !!user;
		},
		setUser(u: AuthUser) {
			user = u;
			initializedToken = getToken();
		},
		async deleteAccount(password: string) {
			await deleteAccountRequest(password);
			clearToken();
			clearCachedUser();
			await clearOfflineUserData(false, user?.id);
			user = null;
			goto('/login?conta_excluida=1');
		},
		logout() {
			clearToken();
			clearCachedUser();
			void clearOfflineUserData(true);
			user = null;
			goto('/login');
		}
	};
}
