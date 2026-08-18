import { fetchWithRetry } from '$lib/utils/fetchRetry';
import { tableUrl } from '$lib/services/external/osrm';
import { EXTERNAL_USER_AGENT } from '$lib/services/external/userAgent';
import type { RequestHandler } from './$types';

const MAX_COORDINATES = 14;

function validCoords(raw: string | null): raw is string {
	if (!raw) return false;
	const pairs = raw.split(';');
	if (pairs.length < 2 || pairs.length > MAX_COORDINATES) return false;
	return pairs.every((pair) => {
		const values = pair.split(',');
		if (values.length !== 2) return false;
		const lon = Number(values[0]);
		const lat = Number(values[1]);
		return (
			Number.isFinite(lat) &&
			Number.isFinite(lon) &&
			lat >= -90 &&
			lat <= 90 &&
			lon >= -180 &&
			lon <= 180
		);
	});
}

export const GET: RequestHandler = async ({ url }) => {
	const coords = url.searchParams.get('coords');
	if (!validCoords(coords)) {
		return new Response(JSON.stringify({}), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const response = await fetchWithRetry(
		tableUrl(coords),
		{ headers: { 'User-Agent': EXTERNAL_USER_AGENT } },
		{ retries: 1, delayMs: 500, label: 'OSRM Table' }
	);
	if (!response) {
		return new Response(
			JSON.stringify({ code: 'Error', message: 'Matriz de rotas indisponível' }),
			{
				status: 502,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	return new Response(await response.text(), {
		headers: { 'Content-Type': 'application/json' }
	});
};
