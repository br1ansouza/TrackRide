import { idbGetAll, idbPut } from '#lib/utils/idb.js';
import { clearOfflineUserData } from './offlinePack';
import { request, setToken, clearToken, isAuthenticated, getToken } from './api';

export { clearToken, isAuthenticated };

export interface AuthUser {
	id: number;
	name: string;
	email: string;
	riding_preference: 'calm' | 'mixed' | 'sport';
	fuel_range_km: number | null;
	created_at: string;
}

const USER_KEY = 'trackride:user';

export function cacheUser(user: AuthUser): void {
	localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getCachedUser(): AuthUser | null {
	try {
		const raw = localStorage.getItem(USER_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

export function clearCachedUser(): void {
	localStorage.removeItem(USER_KEY);
}

export async function claimLegacyPendingRides(): Promise<void> {
	const previous = getCachedUser();
	if (!previous) return;
	const entries = await idbGetAll<{ id: string; userId?: number }>('sync-queue');
	await Promise.all(
		entries
			.filter((entry) => entry.userId === undefined)
			.map((entry) => idbPut('sync-queue', entry.id, { ...entry, userId: previous.id }))
	);
}

async function acceptSession(data: AuthResponse): Promise<AuthUser> {
	const previous = getCachedUser();
	if (previous) await claimLegacyPendingRides();
	if (previous && previous.id !== data.user.id) await clearOfflineUserData(true);
	setToken(data.token);
	cacheUser(data.user);
	return data.user;
}

interface AuthResponse {
	token: string;
	user: AuthUser;
}

export async function register(
	name: string,
	email: string,
	password: string,
	passwordConfirmation: string
): Promise<AuthUser> {
	const data = await request<AuthResponse>('/auth/register', {
		method: 'POST',
		body: JSON.stringify({ name, email, password, password_confirmation: passwordConfirmation })
	});
	return acceptSession(data);
}

export async function login(email: string, password: string): Promise<AuthUser> {
	const data = await request<AuthResponse>('/auth/login', {
		method: 'POST',
		body: JSON.stringify({ email, password })
	});
	return acceptSession(data);
}

export async function fetchMe(): Promise<AuthUser> {
	const token = getToken();
	const data = await request<{ user: AuthUser }>('/auth/me');
	if (getToken() === token) cacheUser(data.user);
	return data.user;
}

export async function updateProfile(params: {
	name?: string;
	riding_preference?: string;
	fuel_range_km?: number;
}): Promise<AuthUser> {
	const data = await request<{ user: AuthUser }>('/auth/profile', {
		method: 'PATCH',
		body: JSON.stringify(params)
	});
	cacheUser(data.user);
	return data.user;
}

export async function deleteAccount(password: string): Promise<void> {
	await request<void>('/auth/account', {
		method: 'DELETE',
		body: JSON.stringify({ password })
	});
}

export async function forgotPassword(email: string): Promise<string> {
	const data = await request<{ message: string }>('/auth/forgot_password', {
		method: 'POST',
		body: JSON.stringify({ email })
	});
	return data.message;
}

export async function resetPassword(
	token: string,
	password: string,
	passwordConfirmation: string
): Promise<string> {
	const data = await request<{ message: string }>('/auth/reset_password', {
		method: 'POST',
		body: JSON.stringify({ token, password, password_confirmation: passwordConfirmation })
	});
	return data.message;
}
