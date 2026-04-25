import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const origin = url.searchParams.get('origin');
	const destination = url.searchParams.get('destination');
	if (!origin || !destination) return new Response(JSON.stringify({}), { status: 400 });

	const response = await fetch(
		`https://router.project-osrm.org/route/v1/driving/${origin};${destination}?overview=full&geometries=geojson&annotations=duration,distance`
	);

	return new Response(await response.text(), {
		headers: { 'Content-Type': 'application/json' }
	});
};
