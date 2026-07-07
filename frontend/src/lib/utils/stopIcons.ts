import { Fuel, UtensilsCrossed, BedDouble, Mountain, MapPin } from 'lucide-svelte';
import type { StopType } from '$lib/types/routeStop';

export const STOP_ICONS: Record<StopType, typeof MapPin> = {
	gas_station: Fuel,
	restaurant: UtensilsCrossed,
	rest: BedDouble,
	viewpoint: Mountain,
	other: MapPin
};

export function stopIcon(type: string): typeof MapPin {
	return STOP_ICONS[type as StopType] ?? MapPin;
}
