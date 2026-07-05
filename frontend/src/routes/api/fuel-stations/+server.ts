import { parseLatLon } from '$lib/server/coords';
import type { RequestHandler } from './$types';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const SEARCH_RADIUS_M = 10000;
const MAX_RESULTS = 10;
const RETRIES = 2;

interface OverpassElement {
	lat?: number;
	lon?: number;
	center?: { lat: number; lon: number };
	tags?: Record<string, string>;
}

async function queryOverpass(query: string): Promise<{ elements: OverpassElement[] } | null> {
	for (let attempt = 0; attempt <= RETRIES; attempt++) {
		try {
			const response = await fetch(OVERPASS_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'User-Agent': 'TrackRide/1.0'
				},
				body: `data=${encodeURIComponent(query)}`
			});
			if (response.ok) return await response.json();
			console.error(`Overpass respondeu ${response.status} (tentativa ${attempt + 1})`);
		} catch (error) {
			console.error(`Overpass falhou (tentativa ${attempt + 1}):`, error);
		}
		if (attempt < RETRIES) await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
	}
	return null;
}

export const GET: RequestHandler = async ({ url }) => {
	const coords = parseLatLon(url);
	if (!coords) {
		return new Response(JSON.stringify([]), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const query = `[out:json][timeout:15];nwr["amenity"="fuel"](around:${SEARCH_RADIUS_M},${coords.lat},${coords.lon});out center ${MAX_RESULTS};`;

	const data = await queryOverpass(query);
	if (!data) {
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
