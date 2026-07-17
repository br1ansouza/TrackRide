import { env } from '$env/dynamic/private';
import { parseLatLon } from '$lib/server/coords';
import { forecastUrl } from '$lib/services/external/owm';
import { TtlCache } from '$lib/utils/ttlCache';
import type { RequestHandler } from './$types';

const cache = new TtlCache<string>(10 * 60 * 1000, 500);

export const GET: RequestHandler = async ({ url }) => {
	const coords = parseLatLon(url);
	if (!coords) return new Response(JSON.stringify({ error: 'lat and lon required' }), { status: 400 });

	const apiKey = env.OPENWEATHERMAP_API_KEY;
	if (!apiKey) return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 });

	const key = `${coords.lat.toFixed(2)},${coords.lon.toFixed(2)}`;
	const cached = cache.get(key);
	if (cached) return new Response(cached, { headers: { 'Content-Type': 'application/json' } });

	try {
		const response = await fetch(forecastUrl(coords.lat, coords.lon, apiKey));

		if (!response.ok) {
			const body = await response.text();
			console.error(`OpenWeatherMap forecast error (${response.status}):`, body);
			return new Response(body, { status: response.status, headers: { 'Content-Type': 'application/json' } });
		}

		const body = await response.text();
		cache.set(key, body);
		return new Response(body, { headers: { 'Content-Type': 'application/json' } });
	} catch (error) {
		console.error('Forecast fetch failed:', error);
		return new Response(JSON.stringify({ error: 'Failed to fetch forecast data' }), { status: 502 });
	}
};
