import { EXTERNAL_USER_AGENT } from './userAgent';
import {
	detectBrand,
	brandLabel,
	sellsLiquidFuel,
	type FuelBrandKey
} from '$lib/services/fuelBrands';

export interface FuelStation {
	name: string;
	lat: number;
	lon: number;
	brand: FuelBrandKey | null;
}

export interface OverpassElement {
	lat?: number;
	lon?: number;
	center?: { lat: number; lon: number };
	tags?: Record<string, string>;
}

const OVERPASS_URLS = [
	'https://overpass-api.de/api/interpreter',
	'https://overpass.private.coffee/api/interpreter'
];
const OVERPASS_TIMEOUT_MS = 6500;
const MAX_RESULTS = 120;
const METERS_PER_LATITUDE_DEGREE = 111_320;

export function fuelBounds(lat: number, lon: number, radiusM: number): string {
	const latDelta = radiusM / METERS_PER_LATITUDE_DEGREE;
	const lonDelta = radiusM / (METERS_PER_LATITUDE_DEGREE * Math.cos((lat * Math.PI) / 180));
	return [lat - latDelta, lon - lonDelta, lat + latDelta, lon + lonDelta]
		.map((value) => value.toFixed(5))
		.join(',');
}

export function fuelPathBounds(path: [number, number][], paddingM: number): string {
	const latitudes = path.map(([lat]) => lat);
	const longitudes = path.map(([, lon]) => lon);
	const minLat = Math.min(...latitudes);
	const maxLat = Math.max(...latitudes);
	const minLon = Math.min(...longitudes);
	const maxLon = Math.max(...longitudes);
	const centerLat = (minLat + maxLat) / 2;
	const latDelta = paddingM / METERS_PER_LATITUDE_DEGREE;
	const lonDelta =
		paddingM / (METERS_PER_LATITUDE_DEGREE * Math.max(0.1, Math.cos((centerLat * Math.PI) / 180)));

	return [minLat - latDelta, minLon - lonDelta, maxLat + latDelta, maxLon + lonDelta]
		.map((value) => value.toFixed(5))
		.join(',');
}

export function fuelQuery(around: string | string[]): string {
	const areas = Array.isArray(around) ? around : [around];
	const selectors = areas
		.map((area) => `node["amenity"="fuel"](${area});way["amenity"="fuel"](${area});`)
		.join('');
	return `[out:json][timeout:6];(${selectors});out center ${MAX_RESULTS};`;
}

export type RoadPoiKind = 'traffic_signals' | 'stop' | 'speed_camera' | 'traffic_calming';

export interface RoadPoi {
	kind: RoadPoiKind;
	lat: number;
	lon: number;
}

const MAX_ROAD_POIS = 400;

export function roadPoiQuery(around: string): string {
	return (
		`[out:json][timeout:25];(` +
		`node["highway"~"^(traffic_signals|stop|speed_camera)$"](${around});` +
		`node["traffic_calming"](${around});` +
		`);out body ${MAX_ROAD_POIS};`
	);
}

function poiKind(tags: Record<string, string> | undefined): RoadPoiKind | null {
	if (!tags) return null;
	if (tags.highway === 'traffic_signals') return 'traffic_signals';
	if (tags.highway === 'stop') return 'stop';
	if (tags.highway === 'speed_camera') return 'speed_camera';
	if (tags.traffic_calming) return 'traffic_calming';
	return null;
}

export function shapeRoadPois(elements: OverpassElement[]): RoadPoi[] {
	return elements
		.map((element) => ({
			kind: poiKind(element.tags),
			lat: element.lat ?? element.center?.lat,
			lon: element.lon ?? element.center?.lon
		}))
		.filter(
			(poi): poi is RoadPoi => poi.kind !== null && poi.lat !== undefined && poi.lon !== undefined
		);
}

export function shapeStations(elements: OverpassElement[]): FuelStation[] {
	return elements
		.filter((element) => sellsLiquidFuel(element.tags))
		.map((element) => {
			const brand = detectBrand(element.tags);
			return {
				name:
					element.tags?.name ??
					element.tags?.brand ??
					(brand ? brandLabel(brand) : 'Posto de combustível'),
				lat: element.lat ?? element.center?.lat,
				lon: element.lon ?? element.center?.lon,
				brand
			};
		})
		.filter(
			(station): station is FuelStation => station.lat !== undefined && station.lon !== undefined
		);
}

async function fetchOverpass(
	url: string,
	query: string,
	signal: AbortSignal
): Promise<{ elements: OverpassElement[] }> {
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'User-Agent': EXTERNAL_USER_AGENT
		},
		body: `data=${encodeURIComponent(query)}`,
		signal
	});
	if (!response.ok) throw new Error(`Overpass ${response.status}`);
	const payload = (await response.json()) as { elements?: OverpassElement[] };
	if (!Array.isArray(payload.elements)) throw new Error('Resposta inválida do Overpass');
	return { elements: payload.elements };
}

export async function queryOverpass(
	query: string,
	concurrent = false
): Promise<{ elements: OverpassElement[] } | null> {
	if (!concurrent) {
		for (const url of OVERPASS_URLS) {
			try {
				return await fetchOverpass(url, query, AbortSignal.timeout(OVERPASS_TIMEOUT_MS));
			} catch {
				continue;
			}
		}
		return null;
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);
	const requests = OVERPASS_URLS.map((url) => fetchOverpass(url, query, controller.signal));

	try {
		const result = await Promise.any(requests);
		controller.abort();
		return result;
	} catch {
		return null;
	} finally {
		clearTimeout(timeout);
	}
}
