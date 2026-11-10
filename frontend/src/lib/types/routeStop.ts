import type { LatLng } from '#lib/services/routing.js';

export type StopType = 'other' | 'gas_station' | 'restaurant' | 'rest' | 'viewpoint';

export interface RouteStopEntry {
	name: string;
	coords: LatLng;
	stopType: StopType;
}
