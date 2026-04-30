const TOKEN_KEY = 'trackride:token';

export const API_URL = typeof window !== 'undefined'
	? `${window.location.protocol}//${window.location.hostname}:3000/api/v1`
	: 'http://localhost:3000/api/v1';

export function getToken(): string | null {
	return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
	localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
	localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
	return !!getToken();
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
	const token = getToken();
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...(token ? { Authorization: `Bearer ${token}` } : {})
	};

	const response = await fetch(`${API_URL}${path}`, { ...options, headers });
	if (response.status === 204) return undefined as T;

	const data = await response.json();
	if (!response.ok) {
		throw new Error(data.error ?? data.errors?.join(', ') ?? 'Erro desconhecido');
	}
	return data;
}
