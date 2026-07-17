import { parseCoord } from '$lib/server/coords';
import { searchUrl, shapePlaces, type PhotonResponse } from '$lib/services/external/photon';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q');
	if (!query) return new Response(JSON.stringify([]), { status: 400 });

	const lat = parseCoord(url.searchParams.get('lat'));
	const lon = parseCoord(url.searchParams.get('lon'));
	const proximity = Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : undefined;

	let data: PhotonResponse;
	try {
		const response = await fetch(searchUrl(query, proximity));
		if (!response.ok) throw new Error(`Photon respondeu ${response.status}`);
		data = await response.json();
	} catch (error) {
		console.error('Geocoding failed:', error);
		return new Response(JSON.stringify([]), {
			status: 502,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	return new Response(JSON.stringify(shapePlaces(data)), {
		headers: { 'Content-Type': 'application/json' }
	});
};
