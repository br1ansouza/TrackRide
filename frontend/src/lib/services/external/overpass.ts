import { fetchWithRetry } from '$lib/utils/fetchRetry';

export interface FuelStation {
	name: string;
	lat: number;
	lon: number;
}

export interface OverpassElement {
	lat?: number;
	lon?: number;
	center?: { lat: number; lon: number };
	tags?: Record<string, string>;
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const MAX_RESULTS = 20;

export function fuelQuery(around: string): string {
	return `[out:json][timeout:15];nwr["amenity"="fuel"](${around});out center ${MAX_RESULTS};`;
}

export function shapeStations(elements: OverpassElement[]): FuelStation[] {
	return elements
		.map((element) => ({
			name: element.tags?.name ?? element.tags?.brand ?? 'Posto de combustível',
			lat: element.lat ?? element.center?.lat,
			lon: element.lon ?? element.center?.lon
		}))
		.filter((station): station is FuelStation =>
			station.lat !== undefined && station.lon !== undefined
		);
}

export async function queryOverpass(query: string): Promise<{ elements: OverpassElement[] } | null> {
	const response = await fetchWithRetry(
		OVERPASS_URL,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'User-Agent': 'TrackRide/1.0'
			},
			body: `data=${encodeURIComponent(query)}`
		},
		{ retries: 2, delayMs: 1000, label: 'Overpass' }
	);
	if (!response) return null;
	return response.json();
}
