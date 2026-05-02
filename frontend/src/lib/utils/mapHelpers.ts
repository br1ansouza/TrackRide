import type { LatLng } from '$lib/services/routing';
import maplibregl from 'maplibre-gl';

export function toLngLat(coords: LatLng): [number, number] {
	return [coords[1], coords[0]];
}

export function toLineCoords(coords: LatLng[]): [number, number][] {
	return coords.map(toLngLat);
}

export function boundsFromCoords(coords: LatLng[]): maplibregl.LngLatBounds {
	const bounds = new maplibregl.LngLatBounds();
	coords.forEach((c) => bounds.extend(toLngLat(c)));
	return bounds;
}

export function calculateBearing(from: LatLng, to: LatLng): number {
	const dLon = ((to[1] - from[1]) * Math.PI) / 180;
	const lat1 = (from[0] * Math.PI) / 180;
	const lat2 = (to[0] * Math.PI) / 180;
	const y = Math.sin(dLon) * Math.cos(lat2);
	const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
	return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function closestRouteIndex(routeCoords: LatLng[], target: LatLng): number {
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
