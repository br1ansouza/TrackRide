export type LatLng = [number, number];

export async function geocode(query: string): Promise<LatLng | null> {
	if (!query.trim()) return null;
	const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
	const data = await response.json();
	const feature = data.features?.[0];
	if (!feature) return null;
	const [lon, lat] = feature.geometry.coordinates;
	return [lat, lon];
}

export async function fetchRoute(origin: LatLng, destination: LatLng): Promise<LatLng[]> {
	const response = await fetch(
		`/api/route?origin=${origin[1]},${origin[0]}&destination=${destination[1]},${destination[0]}`
	);
	const data = await response.json();
	if (data.code !== 'Ok' || !data.routes.length) return [];
	return data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
}
