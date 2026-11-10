import { OPENWEATHERMAP_API_KEY } from '$app/env/private';
import { parseLatLon } from '#lib/server/coords.js';
import { forecastUrl } from '#lib/services/external/owm.js';
import { EXTERNAL_USER_AGENT } from '#lib/services/external/userAgent.js';
import { TtlCache } from '#lib/utils/ttlCache.js';
import type { RequestHandler } from './$types';

const cache = new TtlCache<string>(10 * 60 * 1000, 500);

export const GET: RequestHandler = async ({ url }) => {
	const coords = parseLatLon(url);
	if (!coords)
		return new Response(JSON.stringify({ error: 'lat and lon required' }), { status: 400 });

	const apiKey = OPENWEATHERMAP_API_KEY;
	if (!apiKey)
		return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 });

	const key = `${coords.lat.toFixed(2)},${coords.lon.toFixed(2)}`;
	const cached = cache.get(key);
	if (cached) return new Response(cached, { headers: { 'Content-Type': 'application/json' } });

	try {
		const response = await fetch(forecastUrl(coords.lat, coords.lon, apiKey), {
			signal: AbortSignal.timeout(8000),
			headers: { 'User-Agent': EXTERNAL_USER_AGENT }
		});

		if (!response.ok) {
			return new Response(JSON.stringify({ error: 'Weather service unavailable' }), {
				status: 502,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const body = await response.text();
		cache.set(key, body);
		return new Response(body, { headers: { 'Content-Type': 'application/json' } });
	} catch (error) {
		console.error('Forecast fetch failed');
		return new Response(JSON.stringify({ error: 'Failed to fetch forecast data' }), {
			status: 502
		});
	}
};
