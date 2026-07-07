import type { RequestHandler } from './$types';

const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';
const RETRIES = 2;

async function fetchRoute(waypoints: string): Promise<Response | null> {
	for (let attempt = 0; attempt <= RETRIES; attempt++) {
		try {
			const response = await fetch(
				`${OSRM_URL}/${waypoints}?overview=full&geometries=geojson&annotations=duration,distance`
			);
			if (response.ok) return response;
			console.error(`OSRM respondeu ${response.status} (tentativa ${attempt + 1})`);
		} catch (error) {
			console.error(`OSRM falhou (tentativa ${attempt + 1}):`, error);
		}
		if (attempt < RETRIES) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
	}
	return null;
}

export const GET: RequestHandler = async ({ url }) => {
	const coords = url.searchParams.get('coords');
	const origin = url.searchParams.get('origin');
	const destination = url.searchParams.get('destination');

	const waypoints = coords || (origin && destination ? `${origin};${destination}` : null);
	if (!waypoints) return new Response(JSON.stringify({}), { status: 400 });

	const response = await fetchRoute(waypoints);
	if (!response) {
		return new Response(JSON.stringify({ code: 'Error', message: 'Serviço de roteamento indisponível' }), {
			status: 502,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	return new Response(await response.text(), {
		headers: { 'Content-Type': 'application/json' }
	});
};
