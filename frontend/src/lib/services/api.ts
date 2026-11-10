import { apiStatus } from '$lib/stores/apiStatus.svelte';
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

export class ApiError extends Error {
	constructor(
		message: string,
		public status = 0,
		public retryable = false
	) {
		super(message);
		this.name = 'ApiError';
	}
}
export const isTemporaryError = (error: unknown): boolean =>
	error instanceof TypeError || (error instanceof ApiError && error.retryable);

const OFFLINE_MESSAGE =
	'Sem conexão com a internet. Seus percursos salvos no aparelho serão enviados quando a conexão voltar.';
let wakeUpInFlight: Promise<boolean> | null = null;
const isOffline = () => typeof navigator !== 'undefined' && !navigator.onLine;

// One shared readiness check. Never replay a write whose response may have been lost.
export function wakeUpApi(): Promise<boolean> {
	if (wakeUpInFlight) return wakeUpInFlight;
	if (isOffline()) {
		apiStatus.state = 'offline';
		return Promise.resolve(false);
	}
	apiStatus.state = 'connecting';
	const slow = setTimeout(() => {
		if (apiStatus.state === 'connecting') apiStatus.state = 'waking';
	}, 2500);
	wakeUpInFlight = (async () => {
		const deadline = Date.now() + 60000;
		while (Date.now() < deadline && !isOffline()) {
			try {
				const response = await fetch(`${API_ORIGIN}/up`, {
					cache: 'no-store',
					signal: AbortSignal.timeout(Math.min(10000, deadline - Date.now()))
				});
				if (response.ok) {
					apiStatus.state = 'ready';
					return true;
				}
			} catch {
				/* Retry only the read-only readiness probe. */
			}
			const remaining = deadline - Date.now();
			if (remaining > 0)
				await new Promise((resolve) => setTimeout(resolve, Math.min(2000, remaining)));
		}
		apiStatus.state = isOffline() ? 'offline' : 'unavailable';
		return false;
	})().finally(() => {
		clearTimeout(slow);
		wakeUpInFlight = null;
	});
	return wakeUpInFlight;
}

async function fetchWakingApi(url: string, options: RequestInit): Promise<Response> {
	if (isOffline()) {
		apiStatus.state = 'offline';
		throw new ApiError(OFFLINE_MESSAGE, 0, true);
	}
	if (apiStatus.state !== 'ready' && !(await wakeUpApi())) {
		throw new ApiError(
			isOffline()
				? OFFLINE_MESSAGE
				: 'O servidor ainda não respondeu. Tente novamente em instantes.',
			0,
			true
		);
	}
	const authorization = new Headers(options.headers).get('Authorization');
	if (authorization && authorization !== `Bearer ${getToken()}`)
		throw new ApiError('A sessão mudou. Entre novamente.', 401);
	try {
		const timeout = AbortSignal.timeout(15000);
		const response = await fetch(url, {
			...options,
			signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout
		});
		if (response.status >= 500) apiStatus.state = 'unavailable';
		else apiStatus.state = 'ready';
		return response;
	} catch (error) {
		if (options.signal?.aborted) throw error;
		apiStatus.state = isOffline() ? 'offline' : 'unavailable';
		throw new ApiError(
			isOffline()
				? OFFLINE_MESSAGE
				: 'Não foi possível confirmar a resposta do servidor. Tente novamente em instantes.',
			0,
			true
		);
	}
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
		throw new ApiError('Sessão expirada. Faça login novamente.', 401);
	}

	const data = await response.json().catch(() => ({}));
	if (!response.ok) {
		throw new ApiError(
			data.error ?? data.errors?.join(', ') ?? 'O servidor não conseguiu concluir a solicitação.',
			response.status,
			response.status >= 500 || response.status === 429 || response.status === 408
		);
	}
	return data;
}

function handleSessionExpired(): void {
	clearToken();
	if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
		window.location.assign('/login');
	}
}
