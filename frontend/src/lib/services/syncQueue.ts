import { createRoute, type CreateRouteParams } from './routes';
import { idbPut, idbDelete, idbGetAll } from '#lib/utils/idb.js';
import { getCachedUser } from './auth';
import { getToken, isTemporaryError, ApiError } from './api';
import { syncStatus } from '#lib/stores/syncStatus.svelte.js';

export interface PendingRide {
	id: string;
	userId?: number;
	routeParams: CreateRouteParams;
	exploreRouteId: number | null;
	queuedAt: number;
}

export async function enqueueRide(
	routeParams: CreateRouteParams,
	exploreRouteId: number | null
): Promise<string> {
	const id = routeParams.client_id ?? crypto.randomUUID();
	const user = getCachedUser();
	if (!user) throw new Error('Não foi possível identificar a conta para salvar o percurso.');
	const entry: PendingRide = {
		id,
		userId: user.id,
		routeParams: {
			...routeParams,
			client_id: id,
			...(exploreRouteId && routeParams.completed ? { completed_route_id: exploreRouteId } : {})
		},
		exploreRouteId,
		queuedAt: Date.now()
	};
	await idbPut('sync-queue', id, entry);
	await refreshPendingCount().catch(() => {});
	return id;
}

export async function refreshPendingCount(): Promise<void> {
	const user = getCachedUser();
	if (!user) {
		syncStatus.pending = 0;
		return;
	}
	const entries = await idbGetAll<PendingRide>('sync-queue');
	syncStatus.pending = entries.filter(
		(entry) => entry.userId === undefined || entry.userId === user.id
	).length;
}

let inFlight: Promise<number> | null = null;
export function flushRides(): Promise<number> {
	if (inFlight) return inFlight;
	syncStatus.syncing = true;
	inFlight = flush().finally(() => {
		inFlight = null;
		syncStatus.syncing = false;
	});
	return inFlight;
}
async function flush(): Promise<number> {
	const user = getCachedUser();
	const token = getToken();
	if (!user || !token || !navigator.onLine) return 0;
	const entries = await idbGetAll<PendingRide>('sync-queue').catch(() => []);
	syncStatus.error = '';
	let synced = 0;
	for (const entry of entries) {
		if (getToken() !== token) break;
		if (entry.userId !== undefined && entry.userId !== user.id) continue;
		try {
			await createRoute({
				...entry.routeParams,
				client_id: entry.id,
				...(entry.exploreRouteId && entry.routeParams.completed
					? { completed_route_id: entry.exploreRouteId }
					: {})
			});
			await idbDelete('sync-queue', entry.id);
			synced++;
		} catch (error) {
			syncStatus.error = isTemporaryError(error)
				? ''
				: 'Há um percurso que ainda não pôde ser enviado. Ele continua salvo no aparelho.';
			// Keep every unacknowledged ride, including validation/auth/server failures.
			// The UUID makes retrying a lost success response safe.
			if (isTemporaryError(error) || (error instanceof ApiError && error.status === 401)) break;
		}
	}
	await refreshPendingCount().catch(() => {});
	return synced;
}
