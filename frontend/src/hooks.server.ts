import type { Handle } from '@sveltejs/kit';

const ALLOWED_ORIGINS = new Set(['http://localhost', 'https://localhost', 'capacitor://localhost']);

function corsHeaders(origin: string | null): Record<string, string> {
	if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};
	return {
		'Access-Control-Allow-Origin': origin,
		'Access-Control-Allow-Methods': 'GET, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
		'Access-Control-Max-Age': '86400'
	};
}

export const handle: Handle = async ({ event, resolve }) => {
	if (!event.url.pathname.startsWith('/api/')) return resolve(event);

	const headers = corsHeaders(event.request.headers.get('origin'));

	if (event.request.method === 'OPTIONS') {
		return new Response(null, { status: 204, headers });
	}

	const response = await resolve(event);
	for (const [key, value] of Object.entries(headers)) {
		response.headers.set(key, value);
	}
	return response;
};
