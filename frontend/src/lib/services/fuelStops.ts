import type { LatLng } from '$lib/services/routing';
import type { RouteStopEntry } from '$lib/types/routeStop';
import type { FuelStation } from '$lib/services/external/overpass';
import { fetchFuelStations } from '$lib/services/gateway';
import { haversineM } from '$lib/utils/mapHelpers';

export interface FuelStopSuggestion {
	stops: RouteStopEntry[];
	missedPoints: number;
}

const END_OF_ROUTE_MARGIN_M = 10000;
const DUPLICATE_DISTANCE_M = 500;
const ON_ROUTE_RADIUS_M = 1000;
const DETOUR_RADIUS_M = 10000;
const CORRIDOR_HALF_M = 15000;
const CORRIDOR_STEP_M = 500;

function cumulativeDistancesM(routeCoords: LatLng[]): number[] {
	const distances = [0];
	for (let i = 1; i < routeCoords.length; i++) {
		distances.push(distances[i - 1] + haversineM(routeCoords[i - 1], routeCoords[i]));
	}
	return distances;
}

function sampleRefuelIndexes(
	routeCoords: LatLng[],
	distances: number[],
	intervalKm: number,
	existingStops: RouteStopEntry[]
): number[] {
	const intervalM = intervalKm * 1000;
	const totalM = distances[distances.length - 1];

	const fuelAnchorsM = existingStops
		.filter((stop) => stop.stopType === 'gas_station')
		.map((stop) => distances[closestIndex(routeCoords, stop.coords)])
		.sort((a, b) => a - b);

	const indexes: number[] = [];
	let lastRefuelM = 0;
	let anchorIndex = 0;
	for (let i = 1; i < routeCoords.length; i++) {
		const hereM = distances[i];
		while (anchorIndex < fuelAnchorsM.length && fuelAnchorsM[anchorIndex] <= hereM) {
			lastRefuelM = Math.max(lastRefuelM, fuelAnchorsM[anchorIndex]);
			anchorIndex++;
		}
		if (hereM - lastRefuelM >= intervalM) {
			if (hereM <= totalM - END_OF_ROUTE_MARGIN_M) indexes.push(i);
			lastRefuelM = hereM;
		}
	}
	return indexes;
}

function closestIndex(routeCoords: LatLng[], target: LatLng): number {
	let bestIdx = 0;
	let bestDist = Infinity;
	for (let i = 0; i < routeCoords.length; i++) {
		const dlat = routeCoords[i][0] - target[0];
		const dlon = routeCoords[i][1] - target[1];
		const dist = dlat * dlat + dlon * dlon;
		if (dist < bestDist) { bestDist = dist; bestIdx = i; }
	}
	return bestIdx;
}

function corridorPath(routeCoords: LatLng[], distances: number[], centerIndex: number): LatLng[] {
	const centerM = distances[centerIndex];
	const path: LatLng[] = [];
	let lastM = -Infinity;
	for (let i = 0; i < routeCoords.length; i++) {
		const hereM = distances[i];
		if (hereM < centerM - CORRIDOR_HALF_M) continue;
		if (hereM > centerM + CORRIDOR_HALF_M) break;
		if (hereM - lastM >= CORRIDOR_STEP_M) {
			path.push(routeCoords[i]);
			lastM = hereM;
		}
	}
	return path;
}

async function stationsForPoint(
	routeCoords: LatLng[],
	distances: number[],
	sampleIndex: number
): Promise<FuelStation[]> {
	const corridor = corridorPath(routeCoords, distances, sampleIndex);
	if (corridor.length >= 2) {
		const onRoute = await fetchFuelStations({ path: corridor, radius: ON_ROUTE_RADIUS_M });
		if (onRoute.length > 0) return onRoute;
	}
	return fetchFuelStations({ point: routeCoords[sampleIndex], radius: DETOUR_RADIUS_M });
}

function pickStation(
	stations: FuelStation[],
	samplePoint: LatLng,
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

		const distance = haversineM(samplePoint, coords);
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
	const distances = cumulativeDistancesM(routeCoords);
	const refuelIndexes = sampleRefuelIndexes(routeCoords, distances, intervalKm, existingStops);
	const stationsPerPoint = await Promise.all(
		refuelIndexes.map((index) => stationsForPoint(routeCoords, distances, index))
	);

	const stops: RouteStopEntry[] = [];
	let missedPoints = 0;
	stationsPerPoint.forEach((stations, i) => {
		const picked = pickStation(stations, routeCoords[refuelIndexes[i]], [...existingStops, ...stops]);
		if (picked) {
			stops.push(picked);
		} else {
			missedPoints++;
		}
	});

	return { stops, missedPoints };
}
