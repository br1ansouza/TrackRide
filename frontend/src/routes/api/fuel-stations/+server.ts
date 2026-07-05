import { parseLatLon } from '$lib/server/coords';
import type { RequestHandler } from './$types';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const SEARCH_RADIUS_M = 10000;
const MAX_RESULTS = 10;

interface OverpassElement {
	lat?: number;
	lon?: number;
	center?: { lat: number; lon: number };
	tags?: Record<string, string>;
}

export const GET: RequestHandler = async ({ url }) => {
	const coords = parseLatLon(url);
	if (!coords) {
		return new Response(JSON.stringify([]), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const query = `[out:json][timeout:10];nwr["amenity"="fuel"](around:${SEARCH_RADIUS_M},${coords.lat},${coords.lon});out center ${MAX_RESULTS};`;

	let data: { elements: OverpassElement[] };
	try {
		const response = await fetch(OVERPASS_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'User-Agent': 'TrackRide/1.0'
			},
			body: `data=${encodeURIComponent(query)}`
		});
		if (!response.ok) throw new Error(`Overpass respondeu ${response.status}`);
		data = await response.json();
	} catch (error) {
		console.error('Fuel station search failed:', error);
		return new Response(JSON.stringify([]), {
			status: 502,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const results = data.elements
		.map((element) => ({
			name: element.tags?.name ?? element.tags?.brand ?? 'Posto de combustível',
			lat: element.lat ?? element.center?.lat,
			lon: element.lon ?? element.center?.lon
		}))
		.filter((station): station is { name: string; lat: number; lon: number } =>
			station.lat !== undefined && station.lon !== undefined
		);

	return new Response(JSON.stringify(results), {
		headers: { 'Content-Type': 'application/json' }
	});
};
