const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

export interface OsrmRouteResponse {
	code: string;
	routes: {
		geometry: { coordinates: [number, number][] };
		legs: { annotation?: { duration?: number[]; distance?: number[] } }[];
		duration: number;
		distance: number;
	}[];
}

export function routeUrl(coords: string): string {
	return `${OSRM_URL}/${coords}?overview=full&geometries=geojson&annotations=duration,distance`;
}
