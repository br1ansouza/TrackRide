import { isStandaloneBuild, standaloneOwmKey } from '$lib/utils/platform';
import { fetchWithRetry } from '$lib/utils/fetchRetry';
import { TtlCache } from '$lib/utils/ttlCache';
import { searchUrl, reverseUrl, shapePlaces, pickDistrict, type PlaceResult, type PhotonResponse } from './external/photon';
import { fuelQuery, shapeStations, queryOverpass, type FuelStation } from './external/overpass';
import { routeUrl, type OsrmRouteResponse } from './external/osrm';
import { forecastUrl } from './external/owm';
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

const forecastCache = new TtlCache<ForecastPayload>(10 * 60 * 1000, 500);
const fuelCache = new TtlCache<FuelStation[]>(24 * 60 * 60 * 1000, 200);

export async function fetchForecast(lat: number, lon: number): Promise<ForecastPayload | null> {
	if (!isStandaloneBuild) {
		const response = await fetchWithRetry(`/api/forecast?lat=${lat}&lon=${lon}`, {}, { label: 'Forecast' });
		return response ? response.json() : null;
	}
	if (!standaloneOwmKey) return null;
	const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
	const cached = forecastCache.get(cacheKey);
	if (cached) return cached;
	const response = await fetchWithRetry(forecastUrl(lat, lon, standaloneOwmKey), {}, { label: 'OpenWeatherMap' });
	if (!response) return null;
	const payload: ForecastPayload = await response.json();
	forecastCache.set(cacheKey, payload);
	return payload;
}

export async function fetchOsrmRoute(coords: string): Promise<OsrmRouteResponse | null> {
	if (!isStandaloneBuild) {
		try {
			const response = await fetch(`/api/route?coords=${coords}`);
			return response.ok ? response.json() : null;
		} catch {
			return null;
		}
	}
	const response = await fetchWithRetry(routeUrl(coords), {}, { delayMs: 500, label: 'OSRM' });
	return response ? response.json() : null;
}

export async function searchPlaces(query: string, proximity?: { lat: number; lon: number }): Promise<PlaceResult[]> {
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

export async function fetchFuelStations(params: FuelSearchParams): Promise<FuelStation[]> {
	if (!isStandaloneBuild) return fetchFuelStationsViaProxy(params);
	const around = buildAround(params);
	if (!around) return [];
	const cached = fuelCache.get(around);
	if (cached) return cached;
	const data = await queryOverpass(fuelQuery(around));
	if (!data) return [];
	const stations = shapeStations(data.elements);
	fuelCache.set(around, stations);
	return stations;
}

function buildAround({ path, point, radius }: FuelSearchParams): string | null {
	if (path && path.length >= 2) {
		const flat = path.map(([lat, lon]) => `${lat.toFixed(5)},${lon.toFixed(5)}`).join(',');
		return `around:${radius},${flat}`;
	}
	if (point) return `around:${radius},${point[0].toFixed(3)},${point[1].toFixed(3)}`;
	return null;
}

async function fetchFuelStationsViaProxy({ path, point, radius }: FuelSearchParams): Promise<FuelStation[]> {
	let params: string;
	if (path && path.length >= 2) {
		params = `path=${path.map(([lat, lon]) => `${lat.toFixed(5)},${lon.toFixed(5)}`).join(';')}&radius=${radius}`;
	} else if (point) {
		params = `lat=${point[0]}&lon=${point[1]}&radius=${radius}`;
	} else {
		return [];
	}
	try {
		const response = await fetch(`/api/fuel-stations?${params}`);
		return response.ok ? response.json() : [];
	} catch {
		return [];
	}
}
