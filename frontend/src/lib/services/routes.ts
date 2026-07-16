import { request } from './api';
import type { RouteStopEntry, StopType } from '$lib/types/routeStop';
import { idbGet, idbPut } from '$lib/utils/idb';

export interface SavedRouteStop {
	id: number;
	name: string;
	stop_type: string;
	position: [number, number];
	sort_order: number;
}

export interface SavedRoute {
	id: number;
	name: string;
	origin_name: string;
	destination_name: string;
	origin_coords: [number, number];
	destination_coords: [number, number];
	path_coords: [number, number][] | null;
	distance_km: number | null;
	duration_minutes: number | null;
	score: number | null;
	public: boolean;
	stops: SavedRouteStop[];
	created_at: string;
	updated_at: string;
}

interface RoutesResponse {
	routes: SavedRoute[];
	total: number;
}

export async function fetchSavedRoutes(limit = 20, offset = 0): Promise<RoutesResponse> {
	try {
		const data = await request<RoutesResponse>(`/routes?limit=${limit}&offset=${offset}`);
		if (offset === 0) {
			idbPut('cache', 'saved-routes', data).catch((error) => console.error('Falha ao cachear histórico:', error));
		}
		return data;
	} catch (error) {
		if (error instanceof TypeError && offset === 0) {
			const cached = await idbGet<RoutesResponse>('cache', 'saved-routes').catch(() => undefined);
			if (cached) return cached;
		}
		throw error;
	}
}

export function toStopEntries(stops: SavedRouteStop[]): RouteStopEntry[] {
	return stops.map((stop) => ({
		name: stop.name,
		coords: [stop.position[1], stop.position[0]],
		stopType: stop.stop_type as StopType
	}));
}

export interface RouteStopParams {
	name: string;
	stop_type: string;
	sort_order: number;
	position: [number, number];
}

export interface CreateRouteParams {
	name: string;
	origin_name: string;
	destination_name: string;
	origin_coords: [number, number];
	destination_coords: [number, number];
	path_coords?: number[];
	distance_km?: number;
	duration_minutes?: number;
	score?: number;
	public?: boolean;
	route_stops_attributes?: RouteStopParams[];
}

export async function createRoute(params: CreateRouteParams): Promise<SavedRoute> {
	const data = await request<{ route: SavedRoute }>('/routes', {
		method: 'POST',
		body: JSON.stringify(params)
	});
	return data.route;
}

export async function deleteRoute(id: number): Promise<void> {
	await request(`/routes/${id}`, { method: 'DELETE' });
}

export async function updateRoute(id: number, params: Partial<CreateRouteParams & { public: boolean }>): Promise<void> {
	await request(`/routes/${id}`, { method: 'PATCH', body: JSON.stringify(params) });
}

export interface ExploreRoute extends SavedRoute {
	author_name: string;
	likes_count: number;
	times_completed: number;
	liked_by_user: boolean;
	completed_by_user: boolean;
}

interface ExploreResponse {
	routes: ExploreRoute[];
	total: number;
}

export async function fetchNearbyRoutes(lat: number, lon: number, radius = 80): Promise<ExploreResponse> {
	return request<ExploreResponse>(`/routes/explore?lat=${lat}&lon=${lon}&radius=${radius}`);
}

export async function likeRoute(id: number): Promise<{ likes_count: number }> {
	return request(`/routes/${id}/like`, { method: 'POST' });
}

export async function unlikeRoute(id: number): Promise<{ likes_count: number }> {
	return request(`/routes/${id}/unlike`, { method: 'DELETE' });
}

export async function completeRoute(id: number): Promise<{ times_completed: number }> {
	return request(`/routes/${id}/complete`, { method: 'POST' });
}
