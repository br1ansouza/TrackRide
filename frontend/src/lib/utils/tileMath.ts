import type { LatLng } from '$lib/services/routing';

export interface TileId {
	z: number;
	x: number;
	y: number;
}

export function lngLatToTile(lat: number, lon: number, z: number): { x: number; y: number } {
	const n = 2 ** z;
	const latRad = (lat * Math.PI) / 180;
	const x = Math.floor(((lon + 180) / 360) * n);
	const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
	return {
		x: Math.min(Math.max(x, 0), n - 1),
		y: Math.min(Math.max(y, 0), n - 1)
	};
}

export function corridorTiles(coords: LatLng[], zooms: number[], neighborRadius = 1): TileId[] {
	const seen = new Set<string>();
	const tiles: TileId[] = [];
	for (const z of zooms) {
		const n = 2 ** z;
		for (const [lat, lon] of coords) {
			const center = lngLatToTile(lat, lon, z);
			for (let dx = -neighborRadius; dx <= neighborRadius; dx++) {
				for (let dy = -neighborRadius; dy <= neighborRadius; dy++) {
					const x = (center.x + dx + n) % n;
					const y = center.y + dy;
					if (y < 0 || y >= n) continue;
					const key = `${z}/${x}/${y}`;
					if (seen.has(key)) continue;
					seen.add(key);
					tiles.push({ z, x, y });
				}
			}
		}
	}
	return tiles;
}
