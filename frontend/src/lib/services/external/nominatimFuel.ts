import { brandLabel, detectBrand, sellsLiquidFuel } from '$lib/services/fuelBrands';
import type { FuelStation } from './overpass';

interface NominatimFuelPlace {
	lat?: string;
	lon?: string;
	name?: string;
	display_name?: string;
	category?: string;
	type?: string;
	extratags?: Record<string, string>;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_TIMEOUT_MS = 5000;

function fuelSearchUrl(bounds: string): string | null {
	const [south, west, north, east] = bounds.split(',').map(Number);
	if (![south, west, north, east].every(Number.isFinite)) return null;

	const url = new URL(NOMINATIM_URL);
	url.searchParams.set('format', 'jsonv2');
	url.searchParams.set('bounded', '1');
	url.searchParams.set('limit', '50');
	url.searchParams.set('extratags', '1');
	url.searchParams.set('viewbox', `${west},${north},${east},${south}`);
	url.searchParams.set('q', '[fuel]');
	return url.toString();
}

function shapeFuelPlaces(places: NominatimFuelPlace[]): FuelStation[] {
	return places
		.filter((place) => place.category === 'amenity' && place.type === 'fuel')
		.filter((place) => sellsLiquidFuel(place.extratags))
		.map((place) => {
			const lat = Number(place.lat);
			const lon = Number(place.lon);
			const tags = { ...place.extratags, name: place.name ?? '' };
			const brand = detectBrand(tags);
			return {
				name:
					place.name ||
					place.extratags?.brand ||
					(brand ? brandLabel(brand) : 'Posto de combustível'),
				lat,
				lon,
				brand
			};
		})
		.filter((station) => Number.isFinite(station.lat) && Number.isFinite(station.lon));
}

export async function queryNominatimFuel(bounds: string): Promise<FuelStation[] | null> {
	const url = fuelSearchUrl(bounds);
	if (!url) return null;

	try {
		const response = await fetch(url, {
			headers: {
				Accept: 'application/json',
				'Accept-Language': 'pt-BR',
				'User-Agent': 'TrackRide/1.0 (fuel-stop lookup)'
			},
			signal: AbortSignal.timeout(NOMINATIM_TIMEOUT_MS)
		});
		if (!response.ok) return null;
		const payload = (await response.json()) as NominatimFuelPlace[];
		return Array.isArray(payload) ? shapeFuelPlaces(payload) : null;
	} catch {
		return null;
	}
}
