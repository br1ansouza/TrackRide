import type { LatLng } from '$lib/services/routing';
import type { RouteStopEntry } from '$lib/types/routeStop';
import { haversineM, closestRouteIndex } from '$lib/utils/mapHelpers';

interface FuelStation {
	name: string;
	lat: number;
	lon: number;
}

export interface FuelStopSuggestion {
	stops: RouteStopEntry[];
	missedPoints: number;
}

const END_OF_ROUTE_MARGIN_M = 10000;
const DUPLICATE_DISTANCE_M = 500;

function cumulativeDistancesM(routeCoords: LatLng[]): number[] {
	const distances = [0];
	for (let i = 1; i < routeCoords.length; i++) {
		distances.push(distances[i - 1] + haversineM(routeCoords[i - 1], routeCoords[i]));
	}
	return distances;
}

function sampleRefuelPoints(
	routeCoords: LatLng[],
	intervalKm: number,
	existingStops: RouteStopEntry[]
): LatLng[] {
	const intervalM = intervalKm * 1000;
	const distances = cumulativeDistancesM(routeCoords);
	const totalM = distances[distances.length - 1];

	const fuelAnchorsM = existingStops
		.filter((stop) => stop.stopType === 'gas_station')
		.map((stop) => distances[closestRouteIndex(routeCoords, stop.coords)])
		.sort((a, b) => a - b);

	const points: LatLng[] = [];
	let lastRefuelM = 0;
	let anchorIndex = 0;
	for (let i = 1; i < routeCoords.length; i++) {
		const hereM = distances[i];
		while (anchorIndex < fuelAnchorsM.length && fuelAnchorsM[anchorIndex] <= hereM) {
			lastRefuelM = Math.max(lastRefuelM, fuelAnchorsM[anchorIndex]);
			anchorIndex++;
		}
		if (hereM - lastRefuelM >= intervalM) {
			if (hereM <= totalM - END_OF_ROUTE_MARGIN_M) points.push(routeCoords[i]);
			lastRefuelM = hereM;
		}
	}
	return points;
}

async function fetchStationsNear(point: LatLng): Promise<FuelStation[]> {
	try {
		const response = await fetch(`/api/fuel-stations?lat=${point[0]}&lon=${point[1]}`);
		if (!response.ok) return [];
		return await response.json();
	} catch {
		return [];
	}
}

function pickNearestStation(
	stations: FuelStation[],
	point: LatLng,
	existingStops: RouteStopEntry[]
): RouteStopEntry | null {
	let best: RouteStopEntry | null = null;
	let bestDistance = Infinity;

	for (const station of stations) {
		const coords: LatLng = [station.lat, station.lon];
		const isDuplicate = existingStops.some(
			(stop) => haversineM(stop.coords, coords) < DUPLICATE_DISTANCE_M
		);
		if (isDuplicate) continue;

		const distance = haversineM(point, coords);
		if (distance < bestDistance) {
			bestDistance = distance;
			best = { name: station.name, coords, stopType: 'gas_station' };
		}
	}
	return best;
}

export async function findFuelStops(
	routeCoords: LatLng[],
	intervalKm: number,
	existingStops: RouteStopEntry[]
): Promise<FuelStopSuggestion> {
	const refuelPoints = sampleRefuelPoints(routeCoords, intervalKm, existingStops);
	const stops: RouteStopEntry[] = [];
	let missedPoints = 0;

	for (const point of refuelPoints) {
		const stations = await fetchStationsNear(point);
		const nearest = pickNearestStation(stations, point, [...existingStops, ...stops]);
		if (nearest) {
			stops.push(nearest);
		} else {
			missedPoints++;
		}
	}

	return { stops, missedPoints };
}
