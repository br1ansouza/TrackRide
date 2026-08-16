import { isStandaloneBuild, proxyBaseUrl } from '$lib/utils/platform';
import { fetchWithRetry } from '$lib/utils/fetchRetry';
import { TtlCache } from '$lib/utils/ttlCache';
import {
	searchUrl,
	reverseUrl,
	shapePlaces,
	pickDistrict,
	type PlaceResult,
	type PhotonResponse
} from './external/photon';
import {
	fuelBounds,
	fuelPathBounds,
	fuelQuery,
	shapeStations,
	queryOverpass,
	roadPoiQuery,
	shapeRoadPois,
	type FuelStation,
	type RoadPoi
} from './external/overpass';
import { queryNominatimFuel } from './external/nominatimFuel';
import {
	routeUrl,
	tableUrl,
	type OsrmRouteResponse,
	type OsrmTableResponse
} from './external/osrm';
import type { LatLng } from './routing';

export interface ForecastPayload {
	list?: unknown[];
	city?: { name?: string };
}

export interface FuelSearchParams {
	path?: LatLng[];
	point?: LatLng;
	radius: number;
}

export interface FuelSearchResult {
	stations: FuelStation[];
	unavailable: boolean;
}

const forecastCache = new TtlCache<ForecastPayload>(10 * 60 * 1000, 500);
const fuelCache = new TtlCache<FuelStation[]>(24 * 60 * 60 * 1000, 200);

export async function fetchForecast(lat: number, lon: number): Promise<ForecastPayload | null> {
	if (!isStandaloneBuild) {
		const response = await fetchWithRetry(
			`/api/forecast?lat=${lat}&lon=${lon}`,
			{},
			{ label: 'Forecast' }
		);
		return response ? response.json() : null;
	}
	const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
	const cached = forecastCache.get(cacheKey);
	if (cached) return cached;
	const response = await fetchWithRetry(
		`${proxyBaseUrl}/api/forecast?lat=${lat}&lon=${lon}`,
		{},
		{ label: 'Forecast' }
	);
	if (!response) return null;
	const payload: ForecastPayload = await response.json();
	forecastCache.set(cacheKey, payload);
	return payload;
}

export async function fetchOsrmRoute(
	coords: string,
	bearings?: string
): Promise<OsrmRouteResponse | null> {
	if (!isStandaloneBuild) {
		const query = bearings ? `&bearings=${bearings}` : '';
		try {
			const response = await fetch(`/api/route?coords=${coords}${query}`);
			return response.ok ? response.json() : null;
		} catch {
			return null;
		}
	}
	const response = await fetchWithRetry(
		routeUrl(coords, bearings),
		{},
		{ delayMs: 500, label: 'OSRM' }
	);
	return response ? response.json() : null;
}

export async function fetchOsrmTable(coords: string): Promise<OsrmTableResponse | null> {
	if (!isStandaloneBuild) {
		try {
			const response = await fetch(`/api/route-matrix?coords=${encodeURIComponent(coords)}`, {
				signal: AbortSignal.timeout(8000)
			});
			return response.ok ? response.json() : null;
		} catch {
			return null;
		}
	}
	const response = await fetchWithRetry(
		tableUrl(coords),
		{},
		{ retries: 1, delayMs: 500, label: 'OSRM Table' }
	);
	return response ? response.json() : null;
}

export async function searchPlaces(
	query: string,
	proximity?: { lat: number; lon: number }
): Promise<PlaceResult[]> {
	if (!isStandaloneBuild) {
		const prox = proximity ? `&lat=${proximity.lat}&lon=${proximity.lon}` : '';
		try {
			const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}${prox}`);
			return response.ok ? response.json() : [];
		} catch {
			return [];
		}
	}
	const response = await fetchWithRetry(searchUrl(query, proximity), {}, { label: 'Photon' });
	if (!response) return [];
	return shapePlaces((await response.json()) as PhotonResponse);
}

export async function reverseDistrict(lat: number, lon: number): Promise<string | null> {
	if (!isStandaloneBuild) {
		try {
			const response = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lon}`);
			if (!response.ok) return null;
			const data: { district: string | null } = await response.json();
			return data.district;
		} catch {
			return null;
		}
	}
	const response = await fetchWithRetry(reverseUrl(lat, lon), {}, { label: 'Photon reverse' });
	if (!response) return null;
	return pickDistrict((await response.json()) as PhotonResponse);
}

export async function fetchFuelStations(params: FuelSearchParams): Promise<FuelSearchResult> {
	const bounds = buildFuelBounds(params);
	if (!bounds) return { stations: [], unavailable: false };
	const cached = fuelCache.get(bounds);
	if (cached) return { stations: cached, unavailable: false };

	const proxyResult = await fetchFuelStationsViaProxy(params);
	if (!proxyResult.unavailable) {
		fuelCache.set(bounds, proxyResult.stations);
		return proxyResult;
	}
	if (!isStandaloneBuild) return proxyResult;

	const nominatimStations = await queryNominatimFuel(bounds);
	if (nominatimStations && nominatimStations.length > 0) {
		fuelCache.set(bounds, nominatimStations);
		return { stations: nominatimStations, unavailable: false };
	}
	const data = await queryOverpass(fuelQuery(bounds), true);
	if (!data && nominatimStations === null) return { stations: [], unavailable: true };
	const stations = data ? shapeStations(data.elements) : (nominatimStations ?? []);
	fuelCache.set(bounds, stations);
	return { stations, unavailable: false };
}

const ROAD_POI_RADIUS_M = 25;
const roadPoiCache = new TtlCache<RoadPoi[]>(7 * 24 * 60 * 60 * 1000, 100);
const MAX_FUEL_PATH_POINTS = 80;

export async function fetchRoadPois(path: LatLng[]): Promise<RoadPoi[]> {
	if (path.length < 2) return [];
	const flat = path.map(([lat, lon]) => `${lat.toFixed(5)},${lon.toFixed(5)}`);

	if (!isStandaloneBuild) {
		try {
			const response = await fetch(
				`/api/road-pois?path=${flat.join(';')}&radius=${ROAD_POI_RADIUS_M}`
			);
			return response.ok ? response.json() : [];
		} catch {
			return [];
		}
	}

	const around = `around:${ROAD_POI_RADIUS_M},${flat.join(',')}`;
	const cached = roadPoiCache.get(around);
	if (cached) return cached;
	const data = await queryOverpass(roadPoiQuery(around));
	if (!data) return [];
	const pois = shapeRoadPois(data.elements);
	roadPoiCache.set(around, pois);
	return pois;
}

function buildFuelBounds({ path, point, radius }: FuelSearchParams): string | null {
	if (path && path.length >= 2) {
		return fuelPathBounds(path, radius);
	}
	if (point) return fuelBounds(point[0], point[1], radius);
	return null;
}

function compactFuelPath(path: LatLng[]): LatLng[] {
	if (path.length <= MAX_FUEL_PATH_POINTS) return path;
	return Array.from({ length: MAX_FUEL_PATH_POINTS }, (_, index) => {
		const sourceIndex = Math.round((index * (path.length - 1)) / (MAX_FUEL_PATH_POINTS - 1));
		return path[sourceIndex];
	});
}

async function fetchFuelStationsViaProxy({
	path,
	point,
	radius
}: FuelSearchParams): Promise<FuelSearchResult> {
	let params: string;
	if (path && path.length >= 2) {
		params = `path=${compactFuelPath(path)
			.map(([lat, lon]) => `${lat.toFixed(5)},${lon.toFixed(5)}`)
			.join(';')}&radius=${radius}`;
	} else if (point) {
		params = `lat=${point[0]}&lon=${point[1]}&radius=${radius}`;
	} else {
		return { stations: [], unavailable: false };
	}
	const baseUrl = isStandaloneBuild ? proxyBaseUrl : '';
	if (isStandaloneBuild && !baseUrl) return { stations: [], unavailable: true };
	try {
		const response = await fetch(`${baseUrl}/api/fuel-stations?${params}`, {
			signal: AbortSignal.timeout(8000)
		});
		if (!response.ok) return { stations: [], unavailable: true };
		const stations = (await response.json()) as FuelStation[];
		return Array.isArray(stations)
			? { stations, unavailable: false }
			: { stations: [], unavailable: true };
	} catch {
		return { stations: [], unavailable: true };
	}
}
