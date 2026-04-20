import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const lat = url.searchParams.get('lat');
	const lon = url.searchParams.get('lon');
	if (!lat || !lon) return new Response(JSON.stringify({ error: 'lat and lon required' }), { status: 400 });

	const apiKey = env.OPENWEATHERMAP_API_KEY;
	if (!apiKey) return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 });

	try {
		const response = await fetch(
			`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=pt_br&appid=${apiKey}`
		);

		if (!response.ok) {
			const body = await response.text();
			console.error(`OpenWeatherMap error (${response.status}):`, body);
			return new Response(body, { status: response.status, headers: { 'Content-Type': 'application/json' } });
		}

		return new Response(await response.text(), { headers: { 'Content-Type': 'application/json' } });
	} catch (error) {
		console.error('Weather fetch failed:', error);
		return new Response(JSON.stringify({ error: 'Failed to fetch weather data' }), { status: 502 });
	}
};
