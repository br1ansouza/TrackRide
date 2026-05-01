import { request } from './api';

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
	created_at: string;
	updated_at: string;
}

interface RoutesResponse {
	routes: SavedRoute[];
	total: number;
}

export async function fetchSavedRoutes(limit = 20, offset = 0): Promise<RoutesResponse> {
	return request<RoutesResponse>(`/routes?limit=${limit}&offset=${offset}`);
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
}

interface ExploreResponse {
	routes: ExploreRoute[];
	total: number;
}

export async function fetchNearbyRoutes(lat: number, lon: number, radius = 80): Promise<ExploreResponse> {
	return request<ExploreResponse>(`/routes/explore?lat=${lat}&lon=${lon}&radius=${radius}`);
}
