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

function buildLabel(parts: (string | undefined)[]): string {
	return [...new Set(parts.filter(Boolean))].join(', ');
}

export function shapePlaces(data: PhotonResponse): PlaceResult[] {
	const seenCoords = new Set<string>();
	const candidates = (data.features ?? [])
		.filter((feature) => feature.properties.countrycode === 'BR')
		.map((feature) => {
			const props = feature.properties;
			return {
				name: props.name,
				detail: props.district || props.street,
				city: props.city,
				state: props.state,
				lat: feature.geometry.coordinates[1],
				lon: feature.geometry.coordinates[0]
			};
		})
		.filter((candidate) => {
			if (!Number.isFinite(candidate.lat) || !Number.isFinite(candidate.lon)) return false;
			const key = `${candidate.lat.toFixed(4)},${candidate.lon.toFixed(4)}`;
			if (seenCoords.has(key)) return false;
			seenCoords.add(key);
			return true;
		});

	const plainLabelCount = new Map<string, number>();
	for (const candidate of candidates) {
		const plain = buildLabel([candidate.name, candidate.city, candidate.state]);
		plainLabelCount.set(plain, (plainLabelCount.get(plain) ?? 0) + 1);
	}

	const seenLabels = new Set<string>();
	const results: PlaceResult[] = [];
	for (const candidate of candidates) {
		const plain = buildLabel([candidate.name, candidate.city, candidate.state]);
		const label =
			(plainLabelCount.get(plain) ?? 0) > 1
				? buildLabel([candidate.name, candidate.detail, candidate.city, candidate.state])
				: plain;
		if (seenLabels.has(label)) continue;
		seenLabels.add(label);
		results.push({ label, lat: candidate.lat, lon: candidate.lon });
		if (results.length === MAX_RESULTS) break;
	}
	return results;
}

export function pickDistrict(data: PhotonResponse): string | null {
	const props = data.features?.[0]?.properties;
	return props?.district || props?.locality || props?.city || props?.name || null;
}
