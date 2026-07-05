import { parseLatLon } from '$lib/server/coords';
import type { RequestHandler } from './$types';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const DEFAULT_RADIUS_M = 10000;
const MIN_RADIUS_M = 100;
const MAX_RADIUS_M = 10000;
const MAX_PATH_POINTS = 80;
const MAX_RESULTS = 20;
const RETRIES = 2;

interface OverpassElement {
	lat?: number;
	lon?: number;
	center?: { lat: number; lon: number };
	tags?: Record<string, string>;
}

function parseRadius(url: URL): number {
	const radius = Number(url.searchParams.get('radius') ?? DEFAULT_RADIUS_M);
	if (!Number.isFinite(radius)) return DEFAULT_RADIUS_M;
	return Math.max(MIN_RADIUS_M, Math.min(MAX_RADIUS_M, Math.round(radius)));
}

function parsePath(url: URL): number[] | null {
	const raw = url.searchParams.get('path');
	if (!raw) return null;

	const pairs = raw.split(';', MAX_PATH_POINTS).map((pair) => pair.split(',').map(Number));
	const valid = pairs.length >= 2 && pairs.every(
		([lat, lon]) =>
			Number.isFinite(lat) && Number.isFinite(lon) &&
			lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
	);
	return valid ? pairs.flat() : null;
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
	const radius = parseRadius(url);
	const path = parsePath(url);
	const point = parseLatLon(url);

	let around: string;
	if (path) {
		around = `around:${radius},${path.join(',')}`;
	} else if (point) {
		around = `around:${radius},${point.lat},${point.lon}`;
	} else {
		return new Response(JSON.stringify([]), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const query = `[out:json][timeout:15];nwr["amenity"="fuel"](${around});out center ${MAX_RESULTS};`;

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
