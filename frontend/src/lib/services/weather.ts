import type { LatLng, RouteData } from './routing';

export interface WeatherPoint {
	coords: LatLng;
	temp: number;
	feelsLike: number;
	humidity: number;
	windSpeed: number;
	description: string;
	icon: string;
	locationName: string;
	distanceKm: number;
	estimatedMinutes: number;
}

const MIN_SPACING_KM = 60;

export function sampleRoutePoints(
	routeData: RouteData,
	spacingKm = MIN_SPACING_KM
): { coords: LatLng; distanceKm: number; estimatedMinutes: number }[] {
	const { coords, segmentDistances, segmentDurations } = routeData;
	if (coords.length === 0) return [];

	const points: { coords: LatLng; distanceKm: number; estimatedMinutes: number }[] = [
		{ coords: coords[0], distanceKm: 0, estimatedMinutes: 0 }
	];

	let accDistSinceLastPoint = 0;
	let totalDist = 0;
	let totalTime = 0;

	for (let i = 0; i < segmentDistances.length; i++) {
		const segDist = segmentDistances[i];
		const segTime = segmentDurations[i];
		accDistSinceLastPoint += segDist;
		totalDist += segDist;
		totalTime += segTime;

		if (accDistSinceLastPoint >= spacingKm * 1000) {
			points.push({
				coords: coords[i + 1],
				distanceKm: totalDist / 1000,
				estimatedMinutes: totalTime / 60
			});
			accDistSinceLastPoint = 0;
		}
	}

	const last = coords[coords.length - 1];
	const totalDistKm = (routeData.totalDistance) / 1000;
	const totalTimeMin = (routeData.totalDuration) / 60;
	const lastPoint = points[points.length - 1];

	if (lastPoint.coords[0] !== last[0] || lastPoint.coords[1] !== last[1]) {
		if (accDistSinceLastPoint < spacingKm * 500 && points.length > 1) {
			points[points.length - 1] = { coords: last, distanceKm: totalDistKm, estimatedMinutes: totalTimeMin };
		} else {
			points.push({ coords: last, distanceKm: totalDistKm, estimatedMinutes: totalTimeMin });
		}
	}

	return points;
}

async function fetchWeatherAt(
	point: { coords: LatLng; distanceKm: number; estimatedMinutes: number }
): Promise<WeatherPoint | null> {
	const response = await fetch(`/api/weather?lat=${point.coords[0]}&lon=${point.coords[1]}`);
	if (!response.ok) return null;
	const data = await response.json();
	const w = data.weather?.[0];
	if (!w) return null;

	return {
		coords: point.coords,
		temp: Math.round(data.main.temp),
		feelsLike: Math.round(data.main.feels_like),
		humidity: data.main.humidity,
		windSpeed: data.wind.speed,
		description: w.description,
		icon: w.icon.replace('n', 'd'),
		locationName: data.name ?? '',
		distanceKm: Math.round(point.distanceKm),
		estimatedMinutes: Math.round(point.estimatedMinutes)
	};
}

export async function fetchRouteWeather(routeData: RouteData): Promise<WeatherPoint[]> {
	const points = sampleRoutePoints(routeData);
	const results = await Promise.all(points.map(fetchWeatherAt));
	return results.filter((r): r is WeatherPoint => r !== null);
}
