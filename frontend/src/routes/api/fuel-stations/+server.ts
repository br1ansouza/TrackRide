import { parseLatLon } from '$lib/server/coords';
import {
	fuelBounds,
	fuelQuery,
	shapeStations,
	queryOverpass
} from '$lib/services/external/overpass';
import { TtlCache } from '$lib/utils/ttlCache';
import type { RequestHandler } from './$types';

const DEFAULT_RADIUS_M = 10000;
const MIN_RADIUS_M = 100;
const MAX_RADIUS_M = 10000;
const MAX_PATH_POINTS = 80;

const cache = new TtlCache<string>(24 * 60 * 60 * 1000, 200);

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
				Number.isFinite(lat) &&
				Number.isFinite(lon) &&
				lat >= -90 &&
				lat <= 90 &&
				lon >= -180 &&
				lon <= 180
		);
	return valid ? pairs.flat() : null;
}

export const GET: RequestHandler = async ({ url }) => {
	const radius = parseRadius(url);
	const path = parsePath(url);
	const point = parseLatLon(url);

	let around: string;
	if (path) {
		around = `around:${radius},${path.join(',')}`;
	} else if (point) {
		around = fuelBounds(point.lat, point.lon, radius);
	} else {
		return new Response(JSON.stringify([]), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const cached = cache.get(around);
	if (cached) {
		return new Response(cached, {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=86400'
			}
		});
	}

	const data = await queryOverpass(fuelQuery(around), true);
	if (!data) {
		return new Response(JSON.stringify([]), {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-store',
				'X-TrackRide-Degraded': 'overpass'
			}
		});
	}

	const body = JSON.stringify(shapeStations(data.elements));
	cache.set(around, body);
	return new Response(body, {
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'public, max-age=86400'
		}
	});
};
