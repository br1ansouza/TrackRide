import type { LatLng } from './routing';

export interface WeatherPoint {
	coords: LatLng;
	temp: number;
	feelsLike: number;
	humidity: number;
	windSpeed: number;
	description: string;
	icon: string;
	locationName: string;
}

const MIN_SPACING_KM = 60;

function haversineKm(a: LatLng, b: LatLng): number {
	const toRad = (d: number) => (d * Math.PI) / 180;
	const dLat = toRad(b[0] - a[0]);
	const dLon = toRad(b[1] - a[1]);
	const h =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
	return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function sampleRoutePoints(route: LatLng[], spacingKm = MIN_SPACING_KM): LatLng[] {
	if (route.length === 0) return [];
	const points: LatLng[] = [route[0]];
	let accumulated = 0;

	for (let i = 1; i < route.length; i++) {
		accumulated += haversineKm(route[i - 1], route[i]);
		if (accumulated >= spacingKm) {
			points.push(route[i]);
			accumulated = 0;
		}
	}

	const last = route[route.length - 1];
	const distToLast = haversineKm(points[points.length - 1], last);
	if (distToLast < spacingKm * 0.5 && points.length > 1) {
		points[points.length - 1] = last;
	} else {
		points.push(last);
	}

	return points;
}

async function fetchWeatherAt(coords: LatLng): Promise<WeatherPoint | null> {
	const response = await fetch(`/api/weather?lat=${coords[0]}&lon=${coords[1]}`);
	if (!response.ok) return null;
	const data = await response.json();
	const w = data.weather?.[0];
	if (!w) return null;

	return {
		coords,
		temp: Math.round(data.main.temp),
		feelsLike: Math.round(data.main.feels_like),
		humidity: data.main.humidity,
		windSpeed: data.wind.speed,
		description: w.description,
		icon: w.icon,
		locationName: data.name ?? ''
	};
}

export async function fetchRouteWeather(route: LatLng[]): Promise<WeatherPoint[]> {
	const points = sampleRoutePoints(route);
	const results = await Promise.all(points.map(fetchWeatherAt));
	return results.filter((r): r is WeatherPoint => r !== null);
}
