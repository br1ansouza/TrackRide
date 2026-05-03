import type { LatLng } from '$lib/services/routing';
import { getLastPosition, startBackgroundWatch, stopBackgroundWatch } from '$lib/services/geolocation';

const OFF_ROUTE_THRESHOLD_M = 25;

export interface TrackingOptions {
	plannedRoute: LatLng[];
	onReroute: (position: LatLng) => void;
}

export function useTracking() {
	let active = $state(false);
	let trackedPath = $state<LatLng[]>([]);
	let currentPosition = $state<LatLng | null>(null);
	let startTime = $state<number>(0);
	let elapsed = $state(0);
	let speed = $state(0);
	let distanceM = $state(0);
	let timerInterval = $state<ReturnType<typeof setInterval>>();
	let plannedRoute: LatLng[] = [];
	let onReroute: ((pos: LatLng) => void) | null = null;
	let rerouteNotified = false;

	function haversineM(a: LatLng, b: LatLng): number {
		const R = 6371000;
		const dLat = ((b[0] - a[0]) * Math.PI) / 180;
		const dLon = ((b[1] - a[1]) * Math.PI) / 180;
		const lat1 = (a[0] * Math.PI) / 180;
		const lat2 = (b[0] * Math.PI) / 180;
		const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
		return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
	}

	function distanceToRoute(pos: LatLng): number {
		if (plannedRoute.length < 2) return 0;
		let minDist = Infinity;
		for (let i = 0; i < plannedRoute.length; i++) {
			const d = haversineM(pos, plannedRoute[i]);
			if (d < minDist) minDist = d;
		}
		return minDist;
	}

	function checkOffRoute(pos: LatLng) {
		if (plannedRoute.length === 0 || !onReroute) return;
		const dist = distanceToRoute(pos);
		if (dist > OFF_ROUTE_THRESHOLD_M && !rerouteNotified) {
			rerouteNotified = true;
			onReroute(pos);
		} else if (dist <= OFF_ROUTE_THRESHOLD_M) {
			rerouteNotified = false;
		}
	}

	function addPoint(coords: LatLng) {
		if (trackedPath.length > 0) {
			const last = trackedPath[trackedPath.length - 1];
			const d = haversineM(last, coords);
			if (d < 2) return;
			distanceM += d;
			const timeDelta = (Date.now() - startTime) / 1000;
			speed = timeDelta > 0 ? (distanceM / timeDelta) * 3.6 : 0;
		}
		currentPosition = coords;
		trackedPath = [...trackedPath, coords];
		checkOffRoute(coords);
	}

	function start(options?: TrackingOptions) {
		active = true;
		trackedPath = [];
		distanceM = 0;
		speed = 0;
		startTime = Date.now();
		elapsed = 0;
		rerouteNotified = false;
		plannedRoute = options?.plannedRoute ?? [];
		onReroute = options?.onReroute ?? null;

		const cached = getLastPosition();
		if (cached) {
			currentPosition = cached;
			trackedPath = [cached];
		}

		timerInterval = setInterval(() => {
			elapsed = Math.floor((Date.now() - startTime) / 1000);
		}, 1000);

		startBackgroundWatch({ onPosition: addPoint, onError() {} });
	}

	function updatePlannedRoute(route: LatLng[]) {
		plannedRoute = route;
		rerouteNotified = false;
	}

	function stop(): { path: LatLng[]; distanceKm: number; durationMinutes: number } {
		clearInterval(timerInterval);
		stopBackgroundWatch();
		const result = {
			path: [...trackedPath],
			distanceKm: Math.round(distanceM / 100) / 10,
			durationMinutes: Math.round(elapsed / 60)
		};
		active = false;
		trackedPath = [];
		currentPosition = null;
		distanceM = 0;
		speed = 0;
		elapsed = 0;
		plannedRoute = [];
		onReroute = null;
		return result;
	}

	let distanceKm = $derived(Math.round(distanceM / 100) / 10);
	let elapsedFormatted = $derived(() => {
		const h = Math.floor(elapsed / 3600);
		const m = Math.floor((elapsed % 3600) / 60);
		const s = elapsed % 60;
		const pad = (n: number) => String(n).padStart(2, '0');
		return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
	});
	let speedFormatted = $derived(Math.round(speed));

	return {
		get active() { return active; },
		get trackedPath() { return trackedPath; },
		get currentPosition() { return currentPosition; },
		get distanceKm() { return distanceKm; },
		get elapsedFormatted() { return elapsedFormatted; },
		get speedFormatted() { return speedFormatted; },
		start,
		stop,
		updatePlannedRoute
	};
}
