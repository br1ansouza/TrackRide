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
}

const END_OF_ROUTE_MARGIN_M = 10000;
const OFF_ROUTE_LIMIT_M = 1500;
const OFF_ROUTE_RELAXED_M = 5000;
const SEARCH_RADIUS_M = 5000;
const ACCESS_WINDOW_HALF_M = 25000;
const MAX_ACCESS_DETOUR_M = 2500;
const BRAND_DETOUR_ALLOWANCE_M = 500;
const MAX_ROUTING_CANDIDATES = 12;
const CANDIDATES_PER_BRAND = 2;
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
		if (dist < bestDist) {
			bestDist = dist;
			bestIdx = i;
		}
	}
	return bestIdx;
}

async function stationsForPoints(
	routeCoords: LatLng[],
	refuelIndexes: number[]
): Promise<FuelStation[][]> {
	return Promise.all(
		refuelIndexes.map(async (index) => {
			const point = routeCoords[index];
			const stations = await fetchFuelStations({ point, radius: SEARCH_RADIUS_M });
			return stations.filter(
				(station) => haversineM(point, [station.lat, station.lon]) <= SEARCH_RADIUS_M
			);
		})
	);
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
		Math.max(0, centerM - SEARCH_RADIUS_M - OFF_ROUTE_RELAXED_M)
	);
	const scanEnd = firstIndexAtOrAfter(distances, centerM + SEARCH_RADIUS_M + OFF_ROUTE_RELAXED_M);
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
): Promise<RoutedCandidate[]> {
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
	if (baselineM === null || baselineM === undefined) return [];

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
): Promise<RouteStopEntry | null> {
	const candidates = buildCandidates(stations, routeCoords, distances, sampleIndex, existingStops);
	const strict = candidates.filter((candidate) => candidate.offRouteM <= OFF_ROUTE_LIMIT_M);
	const geometricallyValid =
		strict.length > 0
			? strict
			: candidates.filter((candidate) => candidate.offRouteM <= OFF_ROUTE_RELAXED_M);
	const picked = pickRoutedCandidate(
		await routeCandidates(geometricallyValid, routeCoords, distances, sampleIndex)
	);
	if (!picked) return null;
	return { name: picked.station.name, coords: picked.coords, stopType: 'gas_station' };
}

export async function findFuelStops(
	routeCoords: LatLng[],
	intervalKm: number,
	existingStops: RouteStopEntry[]
): Promise<FuelStopSuggestion> {
	const distances = cumulativeDistancesM(routeCoords);
	const refuelIndexes = sampleRefuelIndexes(routeCoords, distances, intervalKm, existingStops);
	const stationsPerPoint = await stationsForPoints(routeCoords, refuelIndexes);
	const pickedStops = await Promise.all(
		stationsPerPoint.map((stations, i) =>
			pickStation(stations, routeCoords, distances, refuelIndexes[i], existingStops)
		)
	);

	const stops: RouteStopEntry[] = [];
	let missedPoints = 0;
	pickedStops.forEach((picked) => {
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

	return { stops, missedPoints };
}
