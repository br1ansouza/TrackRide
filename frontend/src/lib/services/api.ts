import { configuredApiUrl, isStandaloneBuild, standaloneApiHost } from '$lib/utils/platform';

const TOKEN_KEY = 'trackride:token';

export const API_ORIGIN = configuredApiUrl
	? configuredApiUrl.replace(/\/$/, '')
	: isStandaloneBuild && standaloneApiHost
		? `http://${standaloneApiHost}:3000`
		: typeof window !== 'undefined'
			? `${window.location.protocol}//${window.location.hostname}:3000`
			: 'http://localhost:3000';

export const API_URL = `${API_ORIGIN}/api/v1`;

const COLD_START_RETRY_DELAYS_MS = [1500, 3000, 6000, 10000, 15000, 20000];
const UPSTREAM_DOWN_STATUSES = new Set([502, 503]);
const AMBIGUOUS_TIMEOUT_STATUS = 504;
const REPLAYABLE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const OFFLINE_MESSAGE = 'Sem conexão com a internet. Verifique sua rede e tente de novo.';
const WAKING_UP_MESSAGE =
	'O servidor hiberna quando fica sem uso e pode levar até um minuto para acordar. Tente de novo em instantes.';

let wakeUpInFlight: Promise<void> | null = null;

export function wakeUpApi(): Promise<void> {
	if (typeof fetch === 'undefined') return Promise.resolve();
	if (wakeUpInFlight) return wakeUpInFlight;

	wakeUpInFlight = fetch(`${API_ORIGIN}/up`, { method: 'GET', mode: 'no-cors', cache: 'no-store' })
		.then(() => undefined)
		.catch(() => undefined)
		.finally(() => {
			wakeUpInFlight = null;
		});

	return wakeUpInFlight;
}

function isOffline(): boolean {
	return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function isRetriableStatus(status: number, method: string): boolean {
	if (UPSTREAM_DOWN_STATUSES.has(status)) return true;
	return status === AMBIGUOUS_TIMEOUT_STATUS && REPLAYABLE_METHODS.has(method);
}

async function fetchWakingApi(url: string, options: RequestInit): Promise<Response> {
	const method = (options.method ?? 'GET').toUpperCase();

	for (let attempt = 0; ; attempt++) {
		try {
			const response = await fetch(url, options);
			if (!isRetriableStatus(response.status, method)) return response;
		} catch {
			if (isOffline()) throw new Error(OFFLINE_MESSAGE);
		}

		const delay = COLD_START_RETRY_DELAYS_MS[attempt];
		if (delay === undefined) break;
		await new Promise((resolve) => setTimeout(resolve, delay));
	}

	throw new Error(isOffline() ? OFFLINE_MESSAGE : WAKING_UP_MESSAGE);
}

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

	const response = await fetchWakingApi(`${API_URL}${path}`, { ...options, headers });
	if (response.status === 204) return undefined as T;

	if (response.status === 401 && token) {
		handleSessionExpired();
		throw new Error('Sessão expirada. Faça login novamente.');
	}

	const data = await response.json().catch(() => ({}));
	if (!response.ok) {
		throw new Error(data.error ?? data.errors?.join(', ') ?? 'Erro desconhecido');
	}
	return data;
}

function handleSessionExpired(): void {
	clearToken();
	if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
		window.location.assign('/login');
	}
}
