import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q');
	if (!query) return new Response(JSON.stringify([]), { status: 400 });

	const lat = url.searchParams.get('lat');
	const lon = url.searchParams.get('lon');
	const proximity = lat && lon ? `&lat=${lat}&lon=${lon}` : '';

	const response = await fetch(
		`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=15${proximity}`
	);
	const data = await response.json();

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
