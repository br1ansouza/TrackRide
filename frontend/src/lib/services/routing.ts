export type LatLng = [number, number];

export async function geocode(query: string): Promise<LatLng | null> {
	if (!query.trim()) return null;
	const encoded = encodeURIComponent(query);
	const response = await fetch(
		`https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`
	);
	const data = await response.json();
	if (data.length === 0) return null;
	return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
}

export async function fetchRoute(origin: LatLng, destination: LatLng): Promise<LatLng[]> {
	const response = await fetch(
		`https://router.project-osrm.org/route/v1/driving/${origin[1]},${origin[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson`
	);
	const data = await response.json();
	if (data.code !== 'Ok' || !data.routes.length) return [];
	return data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
}
