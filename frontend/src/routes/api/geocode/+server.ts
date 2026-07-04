import { parseCoord } from '$lib/server/coords';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q');
	if (!query) return new Response(JSON.stringify([]), { status: 400 });

	const lat = parseCoord(url.searchParams.get('lat'));
	const lon = parseCoord(url.searchParams.get('lon'));
	const proximity = Number.isFinite(lat) && Number.isFinite(lon) ? `&lat=${lat}&lon=${lon}` : '';

	let data: { features: { properties: Record<string, string>; geometry: { coordinates: [number, number] } }[] };
	try {
		const response = await fetch(
			`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=15${proximity}`
		);
		if (!response.ok) throw new Error(`Photon respondeu ${response.status}`);
		data = await response.json();
	} catch (error) {
		console.error('Geocoding failed:', error);
		return new Response(JSON.stringify([]), {
			status: 502,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const seen = new Set<string>();
	const results = data.features
		.filter((f: { properties: { countrycode?: string } }) => f.properties.countrycode === 'BR')
		.map((f: { properties: Record<string, string>; geometry: { coordinates: [number, number] } }) => {
			const p = f.properties;
			const parts = [p.name, p.city, p.state].filter(Boolean);
			return {
				label: [...new Set(parts)].join(', '),
				lat: f.geometry.coordinates[1],
				lon: f.geometry.coordinates[0]
			};
		})
		.filter((r: { label: string }) => {
			if (seen.has(r.label)) return false;
			seen.add(r.label);
			return true;
		})
		.slice(0, 5);

	return new Response(JSON.stringify(results), {
		headers: { 'Content-Type': 'application/json' }
	});
};
