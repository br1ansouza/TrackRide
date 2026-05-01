import type { StopType } from '$lib/components/RouteStops.svelte';

export const STOP_COLORS: Record<StopType, { fg: string; bg: string; marker: string }> = {
	gas_station: { fg: '--color-ride-alert-300', bg: '--color-ride-alert-900', marker: '--color-ride-alert-500' },
	restaurant: { fg: '--color-ride-weather-300', bg: '--color-ride-weather-900', marker: '--color-ride-weather-500' },
	rest: { fg: '--color-ride-location-300', bg: '--color-ride-location-900', marker: '--color-ride-location-500' },
	viewpoint: { fg: '--color-ride-alert-700', bg: '--color-ride-alert-900', marker: '--color-ride-alert-700' },
	other: { fg: '--color-surface-400', bg: '--color-surface-800', marker: '--color-surface-500' }
};

export function stopColor(type: StopType | string): { fg: string; bg: string; marker: string } {
	return STOP_COLORS[type as StopType] ?? STOP_COLORS.other;
}
