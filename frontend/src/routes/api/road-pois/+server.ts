import { roadPoiQuery, shapeRoadPois, queryOverpass } from '$lib/services/external/overpass';
import { TtlCache } from '$lib/utils/ttlCache';
import type { RequestHandler } from './$types';

const DEFAULT_RADIUS_M = 25;
const MIN_RADIUS_M = 10;
const MAX_RADIUS_M = 100;
const MAX_PATH_POINTS = 120;

const cache = new TtlCache<string>(7 * 24 * 60 * 60 * 1000, 100);

function parseRadius(url: URL): number {
	const radius = Number(url.searchParams.get('radius') ?? DEFAULT_RADIUS_M);
	if (!Number.isFinite(radius)) return DEFAULT_RADIUS_M;
	return Math.max(MIN_RADIUS_M, Math.min(MAX_RADIUS_M, Math.round(radius)));
}

function parsePath(url: URL): number[] | null {
	const raw = url.searchParams.get('path');
	if (!raw) return null;

	const pairs = raw.split(';', MAX_PATH_POINTS).map((pair) => pair.split(',').map(Number));
	const valid =
		pairs.length >= 2 &&
		pairs.every(
			([lat, lon]) =>
				Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
		);
	return valid ? pairs.flat() : null;
}

export const GET: RequestHandler = async ({ url }) => {
	const path = parsePath(url);
	if (!path) {
		return new Response(JSON.stringify([]), { status: 400, headers: { 'Content-Type': 'application/json' } });
	}

	const around = `around:${parseRadius(url)},${path.join(',')}`;
	const cached = cache.get(around);
	if (cached) return new Response(cached, { headers: { 'Content-Type': 'application/json' } });

	const data = await queryOverpass(roadPoiQuery(around));
	if (!data) {
		return new Response(JSON.stringify([]), {
			headers: { 'Content-Type': 'application/json', 'X-TrackRide-Degraded': 'overpass' }
		});
	}

	const body = JSON.stringify(shapeRoadPois(data.elements));
	cache.set(around, body);
	return new Response(body, { headers: { 'Content-Type': 'application/json' } });
};
