export interface PlaceResult {
	label: string;
	lat: number;
	lon: number;
}

interface PhotonFeature {
	properties: Record<string, string | undefined>;
	geometry: { coordinates: [number, number] };
}

export interface PhotonResponse {
	features?: PhotonFeature[];
}

const PHOTON_URL = 'https://photon.komoot.io';
const FETCH_LIMIT = 15;
const MAX_RESULTS = 5;

export function searchUrl(query: string, proximity?: { lat: number; lon: number }): string {
	const prox = proximity ? `&lat=${proximity.lat}&lon=${proximity.lon}` : '';
	return `${PHOTON_URL}/api/?q=${encodeURIComponent(query)}&limit=${FETCH_LIMIT}${prox}`;
}

export function reverseUrl(lat: number, lon: number): string {
	return `${PHOTON_URL}/reverse?lat=${lat}&lon=${lon}&limit=1`;
}

export function shapePlaces(data: PhotonResponse): PlaceResult[] {
	const seen = new Set<string>();
	return (data.features ?? [])
		.filter((feature) => feature.properties.countrycode === 'BR')
		.map((feature) => {
			const props = feature.properties;
			const parts = [props.name, props.city, props.state].filter(Boolean);
			return {
				label: [...new Set(parts)].join(', '),
				lat: feature.geometry.coordinates[1],
				lon: feature.geometry.coordinates[0]
			};
		})
		.filter((result) => {
			if (seen.has(result.label)) return false;
			seen.add(result.label);
			return true;
		})
		.slice(0, MAX_RESULTS);
}

export function pickDistrict(data: PhotonResponse): string | null {
	const props = data.features?.[0]?.properties;
	return props?.district || props?.locality || props?.city || props?.name || null;
}
