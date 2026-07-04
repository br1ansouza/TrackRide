import { env } from '$env/dynamic/private';
import { parseLatLon } from '$lib/server/coords';
import type { RequestHandler } from './$types';

interface CacheEntry {
	body: string;
	expiresAt: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const cache = new Map<string, CacheEntry>();

function readCache(key: string): string | null {
	const entry = cache.get(key);
	if (!entry) return null;
	if (Date.now() > entry.expiresAt) {
		cache.delete(key);
		return null;
	}
	return entry.body;
}

function writeCache(key: string, body: string): void {
	if (cache.size >= CACHE_MAX_ENTRIES) {
		const now = Date.now();
		for (const [k, v] of cache) {
			if (now > v.expiresAt) cache.delete(k);
		}
		if (cache.size >= CACHE_MAX_ENTRIES) cache.clear();
	}
	cache.set(key, { body, expiresAt: Date.now() + CACHE_TTL_MS });
}

export const GET: RequestHandler = async ({ url }) => {
	const coords = parseLatLon(url);
	if (!coords) return new Response(JSON.stringify({ error: 'lat and lon required' }), { status: 400 });

	const apiKey = env.OPENWEATHERMAP_API_KEY;
	if (!apiKey) return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 });

	const key = `${coords.lat.toFixed(2)},${coords.lon.toFixed(2)}`;
	const cached = readCache(key);
	if (cached) return new Response(cached, { headers: { 'Content-Type': 'application/json' } });

	try {
		const response = await fetch(
			`https://api.openweathermap.org/data/2.5/forecast?lat=${coords.lat}&lon=${coords.lon}&units=metric&lang=pt_br&appid=${apiKey}`
		);

		if (!response.ok) {
			const body = await response.text();
			console.error(`OpenWeatherMap forecast error (${response.status}):`, body);
			return new Response(body, { status: response.status, headers: { 'Content-Type': 'application/json' } });
		}

		const body = await response.text();
		writeCache(key, body);
		return new Response(body, { headers: { 'Content-Type': 'application/json' } });
	} catch (error) {
		console.error('Forecast fetch failed:', error);
		return new Response(JSON.stringify({ error: 'Failed to fetch forecast data' }), { status: 502 });
	}
};
