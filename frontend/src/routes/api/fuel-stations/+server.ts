import { parseLatLon } from '$lib/server/coords';
import {
	fuelBounds,
	fuelPathBounds,
	fuelQuery,
	shapeStations,
	queryOverpass
} from '$lib/services/external/overpass';
import { queryNominatimFuel } from '$lib/services/external/nominatimFuel';
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

function parsePath(url: URL): [number, number][] | null {
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
	return valid ? (pairs as [number, number][]) : null;
}

export const GET: RequestHandler = async ({ url }) => {
	const radius = parseRadius(url);
	const path = parsePath(url);
	const point = parseLatLon(url);

	let bounds: string;
	if (path) {
		bounds = fuelPathBounds(path, radius);
	} else if (point) {
		bounds = fuelBounds(point.lat, point.lon, radius);
	} else {
		return new Response(JSON.stringify([]), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const cached = cache.get(bounds);
	if (cached) {
		return new Response(cached, {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=86400'
			}
		});
	}

	const nominatimStations = await queryNominatimFuel(bounds);
	if (nominatimStations && nominatimStations.length > 0) {
		const body = JSON.stringify(nominatimStations);
		cache.set(bounds, body);
		return new Response(body, {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=86400',
				'X-TrackRide-Source': 'nominatim'
			}
		});
	}

	const data = await queryOverpass(fuelQuery(bounds), true);
	if (!data && nominatimStations === null) {
		return new Response(JSON.stringify({ error: 'fuel_search_unavailable' }), {
			status: 503,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-store'
			}
		});
	}

	const body = JSON.stringify(data ? shapeStations(data.elements) : nominatimStations);
	cache.set(bounds, body);
	return new Response(body, {
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'public, max-age=86400',
			'X-TrackRide-Source': data ? 'overpass' : 'nominatim'
		}
	});
};
