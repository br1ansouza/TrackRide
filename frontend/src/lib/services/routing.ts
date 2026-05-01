export type LatLng = [number, number];

export interface RouteData {
	coords: LatLng[];
	totalDuration: number;
	totalDistance: number;
	segmentDurations: number[];
	segmentDistances: number[];
}

export async function geocode(query: string): Promise<LatLng | null> {
	if (!query.trim()) return null;
	const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
	const data = await response.json();
	const feature = data.features?.[0];
	if (!feature) return null;
	const [lon, lat] = feature.geometry.coordinates;
	return [lat, lon];
}

export async function fetchRoute(
	origin: LatLng,
	destination: LatLng,
	waypoints: LatLng[] = []
): Promise<RouteData | null> {
	const points = [origin, ...waypoints, destination];
	const coords = points.map((p) => `${p[1]},${p[0]}`).join(';');

	const response = await fetch(`/api/route?coords=${coords}`);
	if (!response.ok) return null;

	const data = await response.json();
	if (data.code !== 'Ok' || !data.routes.length) return null;

	const route = data.routes[0];
	const routeCoords: LatLng[] = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);

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
