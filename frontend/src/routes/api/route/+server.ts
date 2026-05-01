import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const coords = url.searchParams.get('coords');
	const origin = url.searchParams.get('origin');
	const destination = url.searchParams.get('destination');

	const waypoints = coords || (origin && destination ? `${origin};${destination}` : null);
	if (!waypoints) return new Response(JSON.stringify({}), { status: 400 });

	const response = await fetch(
		`https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson&annotations=duration,distance`
	);

	if (!response.ok) {
		return new Response(JSON.stringify({ code: 'Error', message: 'Serviço de roteamento indisponível' }), {
			status: 502,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	return new Response(await response.text(), {
		headers: { 'Content-Type': 'application/json' }
	});
};
