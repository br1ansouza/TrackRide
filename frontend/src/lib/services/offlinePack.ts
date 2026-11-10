import type { LatLng, RouteData } from './routing';
import type { WeatherPoint } from './weather';
import type { RouteStopEntry } from '$lib/types/routeStop';
import { idbGet, idbPut, idbDelete, idbClear, idbGetAll } from '$lib/utils/idb';

export interface RoutePack {
	originLabel: string;
	destLabel: string;
	originCoords: LatLng;
	destCoords: LatLng;
	stops: RouteStopEntry[];
	routeData: RouteData;
	weatherPoints: WeatherPoint[];
	editingRouteId: number | null;
	exploreRouteId: number | null;
	savedAt: number;
}

const PACK_KEY = 'current';

export const WEATHER_TTL_MS = 3 * 60 * 60 * 1000;

export async function savePack(pack: RoutePack): Promise<void> {
	try {
		await idbPut('route-packs', PACK_KEY, pack);
	} catch (error) {
		console.error('Falha ao salvar pacote offline:', error);
	}
}

export async function loadPack(): Promise<RoutePack | null> {
	try {
		return (await idbGet<RoutePack>('route-packs', PACK_KEY)) ?? null;
	} catch (error) {
		console.error('Falha ao carregar pacote offline:', error);
		return null;
	}
}

export async function clearPack(): Promise<void> {
	try {
		await idbDelete('route-packs', PACK_KEY);
	} catch (error) {
		console.error('Falha ao limpar pacote offline:', error);
	}
}

export async function clearOfflineUserData(preservePending = false, userId?: number): Promise<void> {
	try {
		await Promise.all([
			idbClear('route-packs'),
			...(preservePending ? [] : [(async () => {
    const entries = await idbGetAll<{ id: string; userId?: number }>('sync-queue');
    await Promise.all(entries.filter(entry => entry.userId === undefined || entry.userId === userId).map(entry => idbDelete('sync-queue', entry.id)));
   })()]),
			idbDelete('cache', 'saved-routes')
		]);
		localStorage.removeItem('trackride:last-position');
		localStorage.removeItem('trackride:background-location-disclosure-v1');
	} catch (error) {
		console.error('Falha ao limpar dados offline do usuário:', error);
	}
}
