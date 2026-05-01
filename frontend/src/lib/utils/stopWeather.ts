import type { LatLng, RouteData } from '$lib/services/routing';
import type { WeatherPoint } from '$lib/services/weather';
import type { RouteStopEntry } from '$lib/components/RouteStops.svelte';

export function distanceBetween(a: LatLng, b: LatLng): number {
	const R = 6371;
	const dLat = ((b[0] - a[0]) * Math.PI) / 180;
	const dLon = ((b[1] - a[1]) * Math.PI) / 180;
	const lat1 = (a[0] * Math.PI) / 180;
	const lat2 = (b[0] * Math.PI) / 180;
	const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

const STOP_PROXIMITY_KM = 30;

export function applyStopsToWeather(
	points: WeatherPoint[],
	stops: RouteStopEntry[],
	routeData: RouteData
): WeatherPoint[] {
	if (stops.length === 0) return points;
	const result = [...points];

	for (const stop of stops) {
		let closestIdx = -1;
		let closestDist = Infinity;
		for (let i = 1; i < result.length - 1; i++) {
			if (result[i].stopType) continue;
			const d = distanceBetween(stop.coords, result[i].coords);
			if (d < closestDist) {
				closestDist = d;
				closestIdx = i;
			}
		}
		if (closestIdx >= 0 && closestDist <= STOP_PROXIMITY_KM) {
			let stopDistKm = 0;
			let stopTimeMin = 0;
			let bestRouteDist = Infinity;
			let totalDist = 0;
			let totalTime = 0;
			for (let j = 0; j < routeData.segmentDistances.length; j++) {
				totalDist += routeData.segmentDistances[j];
				totalTime += routeData.segmentDurations[j];
				const d = distanceBetween(stop.coords, routeData.coords[j + 1]);
				if (d < bestRouteDist) {
					bestRouteDist = d;
					stopDistKm = Math.round(totalDist / 1000);
					stopTimeMin = Math.round(totalTime / 60);
				}
			}
			result[closestIdx] = {
				...result[closestIdx],
				locationName: stop.name,
				stopType: stop.stopType,
				distanceKm: stopDistKm,
				estimatedMinutes: stopTimeMin
			};
		}
	}
	return result;
}
