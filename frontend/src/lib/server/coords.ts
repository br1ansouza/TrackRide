export interface LatLon {
	lat: number;
	lon: number;
}

export function parseCoord(value: string | null): number {
	if (!value?.trim()) return NaN;
	return Number(value);
}

export function parseLatLon(url: URL): LatLon | null {
	const lat = parseCoord(url.searchParams.get('lat'));
	const lon = parseCoord(url.searchParams.get('lon'));
	if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
	if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
	return { lat, lon };
}
