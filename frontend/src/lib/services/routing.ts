import { fetchOsrmRoute } from './gateway';

export type LatLng = [number, number];

export interface RouteData {
	coords: LatLng[];
	totalDuration: number;
	totalDistance: number;
	segmentDurations: number[];
	segmentDistances: number[];
}

export async function fetchRoute(
	origin: LatLng,
	destination: LatLng,
	waypoints: LatLng[] = []
): Promise<RouteData | null> {
	const points = [origin, ...waypoints, destination];
	const coords = points.map((p) => `${p[1]},${p[0]}`).join(';');

	const data = await fetchOsrmRoute(coords);
	if (!data || data.code !== 'Ok' || !data.routes.length) return null;

	const route = data.routes[0];
	const routeCoords: LatLng[] = route.geometry.coordinates.map((c) => [c[1], c[0]]);

	const segmentDurations: number[] = [];
	const segmentDistances: number[] = [];
	for (const leg of route.legs) {
		segmentDurations.push(...(leg.annotation?.duration ?? []));
		segmentDistances.push(...(leg.annotation?.distance ?? []));
	}

	return {
		coords: routeCoords,
		totalDuration: route.duration,
		totalDistance: route.distance,
		segmentDurations,
		segmentDistances
	};
}
