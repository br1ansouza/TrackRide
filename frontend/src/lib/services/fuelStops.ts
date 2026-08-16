import type { LatLng } from '$lib/services/routing';
import type { RouteStopEntry } from '$lib/types/routeStop';
import type { FuelStation } from '$lib/services/external/overpass';
import { fetchFuelStations, fetchOsrmTable } from '$lib/services/gateway';
import { haversineM } from '$lib/utils/mapHelpers';
import { snapToPath } from '$lib/utils/geoMath';
import { BRAND_PRIORITY, type FuelBrandKey } from '$lib/services/fuelBrands';

export interface FuelStopSuggestion {
	stops: RouteStopEntry[];
	missedPoints: number;
	lookupFailedPoints: number;
}

const END_OF_ROUTE_MARGIN_M = 10000;
const OFF_ROUTE_RELAXED_M = 5000;
const SEARCH_LATERAL_M = 5000;
const SEARCH_ROUTE_HALF_M = 15000;
const REFUEL_ANCHOR_TOLERANCE_M = SEARCH_ROUTE_HALF_M + OFF_ROUTE_RELAXED_M;
const ACCESS_WINDOW_HALF_M = 25000;
const MAX_ACCESS_DETOUR_M = 2500;
const BRAND_DETOUR_ALLOWANCE_M = 500;
const MAX_ROUTING_CANDIDATES = 12;
const CANDIDATES_PER_BRAND = 1;
const DUPLICATE_DISTANCE_M = 500;

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
	for (const anchorM of fuelAnchorsM) {
		while (anchorM - lastRefuelM > intervalM + REFUEL_ANCHOR_TOLERANCE_M) {
			const targetM = lastRefuelM + intervalM;
			if (targetM <= totalM - END_OF_ROUTE_MARGIN_M) {
				indexes.push(firstIndexAtOrAfter(distances, targetM));
			}
			lastRefuelM = targetM;
		}
		lastRefuelM = Math.max(lastRefuelM, anchorM);
	}
	while (lastRefuelM + intervalM <= totalM - END_OF_ROUTE_MARGIN_M) {
		lastRefuelM += intervalM;
		indexes.push(firstIndexAtOrAfter(distances, lastRefuelM));
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
		if (dist < bestDist) {
			bestDist = dist;
			bestIdx = i;
		}
	}
	return bestIdx;
}

async function stationsForPoints(
	routeCoords: LatLng[],
	distances: number[],
	refuelIndexes: number[]
): Promise<{ stations: FuelStation[]; unavailable: boolean }[]> {
	const results: { stations: FuelStation[]; unavailable: boolean }[] = [];
	for (const index of refuelIndexes) {
		const centerM = distances[index];
		const start = firstIndexAtOrAfter(distances, Math.max(0, centerM - SEARCH_ROUTE_HALF_M));
		const end = firstIndexAtOrAfter(distances, centerM + SEARCH_ROUTE_HALF_M);
		results.push(
			await fetchFuelStations({
				path: routeCoords.slice(start, Math.min(routeCoords.length, end + 1)),
				radius: SEARCH_LATERAL_M
			})
		);
	}
	return results;
}

interface Candidate {
	station: FuelStation;
	coords: LatLng;
	offRouteM: number;
	fromSampleM: number;
}

interface RoutedCandidate extends Candidate {
	detourM: number;
}

function buildCandidates(
	stations: FuelStation[],
	routeCoords: LatLng[],
	distances: number[],
	sampleIndex: number,
	existingStops: RouteStopEntry[]
): Candidate[] {
	const candidates: Candidate[] = [];
	const centerM = distances[sampleIndex];
	const scanStart = firstIndexAtOrAfter(
		distances,
		Math.max(0, centerM - SEARCH_ROUTE_HALF_M - OFF_ROUTE_RELAXED_M)
	);
	const scanEnd = firstIndexAtOrAfter(
		distances,
		centerM + SEARCH_ROUTE_HALF_M + OFF_ROUTE_RELAXED_M
	);
	const localPath = routeCoords.slice(scanStart, Math.min(routeCoords.length, scanEnd + 1));

	for (const station of stations) {
		const coords: LatLng = [station.lat, station.lon];
		const isDuplicate = existingStops.some(
			(stop) => haversineM(stop.coords, coords) < DUPLICATE_DISTANCE_M
		);
		if (isDuplicate) continue;

		const snap = snapToPath(localPath, coords, 0, localPath.length);
		candidates.push({
			station,
			coords,
			offRouteM: snap.distanceM,
			fromSampleM: haversineM(routeCoords[sampleIndex], coords)
		});
	}

	return candidates.sort((a, b) => a.fromSampleM - b.fromSampleM);
}

function firstIndexAtOrAfter(distances: number[], targetM: number): number {
	let low = 0;
	let high = distances.length - 1;
	while (low < high) {
		const middle = Math.floor((low + high) / 2);
		if (distances[middle] < targetM) low = middle + 1;
		else high = middle;
	}
	return low;
}

function brandRank(brand: FuelBrandKey | null): number {
	const rank = brand ? BRAND_PRIORITY.indexOf(brand) : -1;
	return rank === -1 ? BRAND_PRIORITY.length : rank;
}

function routingShortlist(candidates: Candidate[]): Candidate[] {
	const selected: Candidate[] = [];
	const add = (candidate: Candidate) => {
		if (!selected.includes(candidate) && selected.length < MAX_ROUTING_CANDIDATES)
			selected.push(candidate);
	};

	for (const brand of BRAND_PRIORITY) {
		candidates
			.filter((candidate) => candidate.station.brand === brand)
			.slice(0, CANDIDATES_PER_BRAND)
			.forEach(add);
	}
	candidates.forEach(add);
	return selected;
}

async function routeCandidates(
	candidates: Candidate[],
	routeCoords: LatLng[],
	distances: number[],
	sampleIndex: number
): Promise<RoutedCandidate[] | null> {
	const shortlist = routingShortlist(candidates);
	if (shortlist.length === 0) return [];

	const centerM = distances[sampleIndex];
	const beforeIndex = firstIndexAtOrAfter(distances, Math.max(0, centerM - ACCESS_WINDOW_HALF_M));
	const afterIndex = firstIndexAtOrAfter(distances, centerM + ACCESS_WINDOW_HALF_M);
	const points = [
		routeCoords[beforeIndex],
		routeCoords[afterIndex],
		...shortlist.map((candidate) => candidate.coords)
	];
	const coords = points.map(([lat, lon]) => `${lon},${lat}`).join(';');
	const table = await fetchOsrmTable(coords);
	const matrix = table?.code === 'Ok' ? table.distances : undefined;
	const baselineM = matrix?.[0]?.[1];
	if (baselineM === null || baselineM === undefined) return null;

	return shortlist.flatMap((candidate, index) => {
		const toStationM = matrix?.[0]?.[index + 2];
		const fromStationM = matrix?.[index + 2]?.[1];
		if (
			toStationM === null ||
			toStationM === undefined ||
			fromStationM === null ||
			fromStationM === undefined
		)
			return [];
		const detourM = Math.max(0, toStationM + fromStationM - baselineM);
		return detourM <= MAX_ACCESS_DETOUR_M ? [{ ...candidate, detourM }] : [];
	});
}

function pickRoutedCandidate(candidates: RoutedCandidate[]): RoutedCandidate | null {
	if (candidates.length === 0) return null;
	const bestDetourM = Math.min(...candidates.map((candidate) => candidate.detourM));
	return candidates
		.filter((candidate) => candidate.detourM <= bestDetourM + BRAND_DETOUR_ALLOWANCE_M)
		.sort(
			(a, b) =>
				brandRank(a.station.brand) - brandRank(b.station.brand) ||
				a.detourM - b.detourM ||
				a.fromSampleM - b.fromSampleM
		)[0];
}

async function pickStation(
	stations: FuelStation[],
	routeCoords: LatLng[],
	distances: number[],
	sampleIndex: number,
	existingStops: RouteStopEntry[]
): Promise<{ stop: RouteStopEntry | null; unavailable: boolean }> {
	const candidates = buildCandidates(stations, routeCoords, distances, sampleIndex, existingStops);
	const geometricallyValid = candidates.filter(
		(candidate) => candidate.offRouteM <= OFF_ROUTE_RELAXED_M
	);
	const routed = await routeCandidates(geometricallyValid, routeCoords, distances, sampleIndex);
	if (routed === null) return { stop: null, unavailable: true };
	const picked = pickRoutedCandidate(routed);
	if (!picked) return { stop: null, unavailable: false };
	return {
		stop: { name: picked.station.name, coords: picked.coords, stopType: 'gas_station' },
		unavailable: false
	};
}

export async function findFuelStops(
	routeCoords: LatLng[],
	intervalKm: number,
	existingStops: RouteStopEntry[]
): Promise<FuelStopSuggestion> {
	const distances = cumulativeDistancesM(routeCoords);
	const refuelIndexes = sampleRefuelIndexes(routeCoords, distances, intervalKm, existingStops);
	const stationsPerPoint = await stationsForPoints(routeCoords, distances, refuelIndexes);
	const pickedStops = await Promise.all(
		stationsPerPoint.map((result, i) =>
			result.unavailable
				? { stop: null, unavailable: true }
				: pickStation(result.stations, routeCoords, distances, refuelIndexes[i], existingStops)
		)
	);

	const stops: RouteStopEntry[] = [];
	let missedPoints = 0;
	let lookupFailedPoints = 0;
	pickedStops.forEach(({ stop: picked, unavailable }) => {
		if (unavailable) {
			lookupFailedPoints++;
			return;
		}
		const duplicate =
			picked &&
			[...existingStops, ...stops].some(
				(stop) => haversineM(stop.coords, picked.coords) < DUPLICATE_DISTANCE_M
			);
		if (picked && !duplicate) {
			stops.push(picked);
		} else {
			missedPoints++;
		}
	});

	return { stops, missedPoints, lookupFailedPoints };
}
