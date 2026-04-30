import { request, setToken, clearToken, isAuthenticated } from './api';

export { clearToken, isAuthenticated };

export interface AuthUser {
	id: number;
	name: string;
	email: string;
	riding_preference: 'calm' | 'mixed' | 'sport';
	created_at: string;
}

interface AuthResponse {
	token: string;
	user: AuthUser;
}

export async function register(name: string, email: string, password: string, passwordConfirmation: string): Promise<AuthUser> {
	const data = await request<AuthResponse>('/auth/register', {
		method: 'POST',
		body: JSON.stringify({ name, email, password, password_confirmation: passwordConfirmation })
	});
	setToken(data.token);
	return data.user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
	const data = await request<AuthResponse>('/auth/login', {
		method: 'POST',
		body: JSON.stringify({ email, password })
	});
	setToken(data.token);
	return data.user;
}

export async function fetchMe(): Promise<AuthUser> {
	const data = await request<{ user: AuthUser }>('/auth/me');
	return data.user;
}

export async function updateProfile(params: { name?: string; riding_preference?: string }): Promise<AuthUser> {
	const data = await request<{ user: AuthUser }>('/auth/profile', {
		method: 'PATCH',
		body: JSON.stringify(params)
	});
	return data.user;
}
