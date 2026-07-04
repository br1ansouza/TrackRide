import { parseLatLon } from '$lib/server/coords';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const coords = parseLatLon(url);
	if (!coords) return new Response(JSON.stringify({ error: 'lat and lon required' }), { status: 400 });

	try {
		const response = await fetch(
			`https://photon.komoot.io/reverse?lat=${coords.lat}&lon=${coords.lon}&limit=1`
		);
		if (!response.ok) {
			return new Response(JSON.stringify({ district: null }), {
				status: 502,
				headers: { 'Content-Type': 'application/json' }
			});
		}
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
	} catch (error) {
		console.error('Reverse geocoding failed:', error);
		return new Response(JSON.stringify({ district: null }), {
			status: 502,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
