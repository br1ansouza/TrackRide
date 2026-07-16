import { createRoute, completeRoute, type CreateRouteParams } from './routes';
import { idbPut, idbDelete, idbGetAll } from '$lib/utils/idb';

export interface PendingRide {
	id: string;
	routeParams: CreateRouteParams;
	exploreRouteId: number | null;
	queuedAt: number;
}

export async function enqueueRide(routeParams: CreateRouteParams, exploreRouteId: number | null): Promise<void> {
	const entry: PendingRide = {
		id: crypto.randomUUID(),
		routeParams,
		exploreRouteId,
		queuedAt: Date.now()
	};
	await idbPut('sync-queue', entry.id, entry);
}

export async function flushRides(): Promise<number> {
	let entries: PendingRide[];
	try {
		entries = await idbGetAll<PendingRide>('sync-queue');
	} catch {
		return 0;
	}

	let synced = 0;
	for (const entry of entries) {
		try {
			await createRoute(entry.routeParams);
			if (entry.exploreRouteId) await completeRoute(entry.exploreRouteId).catch(() => {});
			await idbDelete('sync-queue', entry.id);
			synced++;
		} catch (error) {
			const isNetworkError = error instanceof TypeError;
			if (isNetworkError) break;
			await idbDelete('sync-queue', entry.id);
		}
	}
	return synced;
}
