import type { LatLng } from '$lib/services/routing';

const EARTH_R = 6371000;
const RAD = Math.PI / 180;

function toXY(point: LatLng, lat0: number): [number, number] {
	return [EARTH_R * point[1] * RAD * Math.cos(lat0 * RAD), EARTH_R * point[0] * RAD];
}

export interface SnapResult {
	distanceM: number;
	index: number;
	point: LatLng;
}

const RESCAN_THRESHOLD_M = 200;

export function snapToPath(path: LatLng[], position: LatLng, fromIndex = 0, window = 80): SnapResult {
	if (path.length < 2) return { distanceM: Infinity, index: 0, point: position };

	const lat0 = position[0];
	const [px, py] = toXY(position, lat0);

	const scan = (start: number, end: number): SnapResult => {
		let best: SnapResult = { distanceM: Infinity, index: start, point: position };

		for (let i = start; i < end; i++) {
			const [ax, ay] = toXY(path[i], lat0);
			const [bx, by] = toXY(path[i + 1], lat0);
			const dx = bx - ax;
			const dy = by - ay;
			const lengthSq = dx * dx + dy * dy;
			const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
			const distance = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));

			if (distance < best.distanceM) {
				best = {
					distanceM: distance,
					index: i,
					point: [
						path[i][0] + t * (path[i + 1][0] - path[i][0]),
						path[i][1] + t * (path[i + 1][1] - path[i][1])
					]
				};
			}
		}
		return best;
	};

	const start = Math.max(0, fromIndex - 5);
	const end = Math.min(path.length - 1, fromIndex + window);
	const windowed = scan(start, end);

	const coveredWholePath = start === 0 && end === path.length - 1;
	if (windowed.distanceM <= RESCAN_THRESHOLD_M || coveredWholePath) return windowed;

	return scan(0, path.length - 1);
}
