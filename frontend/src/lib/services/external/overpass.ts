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

const OVERPASS_URLS = [
	'https://overpass-api.de/api/interpreter',
	'https://overpass.private.coffee/api/interpreter'
];
const OVERPASS_TIMEOUT_MS = 15_000;
const MAX_RESULTS = 20;

export function fuelQuery(around: string): string {
	return `[out:json][timeout:15];nwr["amenity"="fuel"](${around});out center ${MAX_RESULTS};`;
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
		.filter((poi): poi is RoadPoi => poi.kind !== null && poi.lat !== undefined && poi.lon !== undefined);
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
	for (const url of OVERPASS_URLS) {
		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'User-Agent': 'TrackRide/1.0'
				},
				body: `data=${encodeURIComponent(query)}`,
				signal: AbortSignal.timeout(OVERPASS_TIMEOUT_MS)
			});
			if (!response.ok) continue;
			const payload = await response.json() as { elements?: OverpassElement[] };
			if (Array.isArray(payload.elements)) return { elements: payload.elements };
		} catch {
			continue;
		}
	}
	return null;
}
