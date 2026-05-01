import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const lat = url.searchParams.get('lat');
	const lon = url.searchParams.get('lon');
	if (!lat || !lon) return new Response(JSON.stringify({ error: 'lat and lon required' }), { status: 400 });

	const response = await fetch(
		`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&limit=1`
	);
	const data = await response.json();

	const feature = data.features?.[0];
	const props = feature?.properties;
	const district = props?.district
		|| props?.locality
		|| props?.city
		|| props?.name
		|| null;

	return new Response(JSON.stringify({ district }), {
		headers: { 'Content-Type': 'application/json' }
	});
};
