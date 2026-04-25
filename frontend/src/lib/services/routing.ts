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

export async function fetchRoute(origin: LatLng, destination: LatLng): Promise<RouteData | null> {
	const response = await fetch(
		`/api/route?origin=${origin[1]},${origin[0]}&destination=${destination[1]},${destination[0]}`
	);
	const data = await response.json();
	if (data.code !== 'Ok' || !data.routes.length) return null;

	const route = data.routes[0];
	const coords: LatLng[] = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);

	return {
		coords,
		totalDuration: route.duration,
		totalDistance: route.distance,
		segmentDurations: route.legs[0]?.annotation?.duration ?? [],
		segmentDistances: route.legs[0]?.annotation?.distance ?? []
	};
}
