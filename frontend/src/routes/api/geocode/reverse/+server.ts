import { parseLatLon } from '$lib/server/coords';
import { reverseUrl, pickDistrict } from '$lib/services/external/photon';
import { EXTERNAL_USER_AGENT } from '$lib/services/external/userAgent';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const coords = parseLatLon(url);
	if (!coords) return new Response(JSON.stringify({ error: 'lat and lon required' }), { status: 400 });

	try {
		const response = await fetch(reverseUrl(coords.lat, coords.lon), {
			headers: { 'User-Agent': EXTERNAL_USER_AGENT }
		});
		if (!response.ok) {
			return new Response(JSON.stringify({ district: null }), {
				status: 502,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		const data = await response.json();

		return new Response(JSON.stringify({ district: pickDistrict(data) }), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('Reverse geocoding failed:', error);
		return new Response(JSON.stringify({ district: null }), {
			status: 502,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
