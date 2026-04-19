import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q');
	if (!query) return new Response(JSON.stringify([]), { status: 400 });

	const response = await fetch(
		`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10`
	);
	const data = await response.json();

	const results = data.features
		.filter((f: { properties: { countrycode?: string } }) => f.properties.countrycode === 'BR')
		.slice(0, 5)
		.map((f: { properties: Record<string, string>; geometry: { coordinates: [number, number] } }) => {
			const p = f.properties;
			const parts = [p.name, p.city, p.state].filter(Boolean);
			return {
				label: [...new Set(parts)].join(', '),
				lat: f.geometry.coordinates[1],
				lon: f.geometry.coordinates[0]
			};
		});

	return new Response(JSON.stringify(results), {
		headers: { 'Content-Type': 'application/json' }
	});
};
