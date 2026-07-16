import type { LatLng, RouteData } from './routing';
import type { WeatherPoint } from './weather';
import type { RouteStopEntry } from '$lib/types/routeStop';
import { idbGet, idbPut, idbDelete, idbClear } from '$lib/utils/idb';

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

export async function clearOfflineUserData(): Promise<void> {
	try {
		await Promise.all([
			idbClear('route-packs'),
			idbClear('sync-queue'),
			idbDelete('cache', 'saved-routes')
		]);
	} catch (error) {
		console.error('Falha ao limpar dados offline do usuário:', error);
	}
}
