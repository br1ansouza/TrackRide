const OSRM_BASE_URL = 'https://router.project-osrm.org';
const OSRM_ROUTE_URL = `${OSRM_BASE_URL}/route/v1/driving`;
const OSRM_TABLE_URL = `${OSRM_BASE_URL}/table/v1/driving`;

export interface OsrmRouteResponse {
	code: string;
	routes: {
		geometry: { coordinates: [number, number][] };
		legs: { annotation?: { duration?: number[]; distance?: number[] } }[];
		duration: number;
		distance: number;
	}[];
}

export interface OsrmTableResponse {
	code: string;
	distances?: (number | null)[][];
}

export function routeUrl(coords: string, bearings?: string): string {
	const url = `${OSRM_ROUTE_URL}/${coords}?overview=full&geometries=geojson&annotations=duration,distance`;
	return bearings ? `${url}&bearings=${bearings}` : url;
}

export function tableUrl(coords: string): string {
	return `${OSRM_TABLE_URL}/${coords}?annotations=distance`;
}
