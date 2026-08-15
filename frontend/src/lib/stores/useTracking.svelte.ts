import type { LatLng } from '$lib/services/routing';
import { haversineM } from '$lib/utils/mapHelpers';
import { getLastPosition, startBackgroundWatch, stopBackgroundWatch, type GeoFix } from '$lib/services/geolocation';

const OFF_ROUTE_THRESHOLD_M = 25;

const ACCURACY_REJECT_M = 50;
const ACCURACY_DISTANCE_M = 25;
const MIN_STEP_M = 3;
const STOPPED_MS = 0.7;
const SPEED_ALPHA = 0.5;
const SPEED_STALE_MS = 1500;
const SPEED_TICK_MS = 100;

export interface TrackingOptions {
	plannedRoute: LatLng[];
	approachRoute?: LatLng[];
	routeOrigin?: LatLng;
	onReroute: (position: LatLng) => void;
	onApproachComplete?: () => void;
}

const APPROACH_ARRIVAL_M = 50;

export function useTracking() {
	let active = $state(false);
	let trackedPath = $state<LatLng[]>([]);
	let currentPosition = $state<LatLng | null>(null);
	let startTime = $state<number>(0);
	let elapsed = $state(0);
	let speedMs = $state(0);
	let distanceM = $state(0);
	let timerInterval = $state<ReturnType<typeof setInterval>>();
	let speedInterval = $state<ReturnType<typeof setInterval>>();
	let lastFix: GeoFix | null = null;
	let lastFixAt = 0;
	let targetSpeedMs = 0;
	let plannedRoute: LatLng[] = [];
	let onReroute: ((pos: LatLng) => void) | null = null;
	let rerouteNotified = false;
	let inApproach = $state(false);
	let routeOrigin: LatLng | null = null;
	let onApproachComplete: (() => void) | null = null;

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
		if (inApproach && routeOrigin) {
			if (haversineM(pos, routeOrigin) <= APPROACH_ARRIVAL_M) {
				inApproach = false;
				routeOrigin = null;
				onApproachComplete?.();
			}
			return;
		}
		if (plannedRoute.length === 0 || !onReroute) return;
		const dist = distanceToRoute(pos);
		if (dist > OFF_ROUTE_THRESHOLD_M && !rerouteNotified) {
			rerouteNotified = true;
			onReroute(pos);
		} else if (dist <= OFF_ROUTE_THRESHOLD_M) {
			rerouteNotified = false;
		}
	}

	function instantSpeedMs(fix: GeoFix): number {
		if (fix.speedMs !== null && fix.speedMs >= 0) return fix.speedMs;
		if (!lastFix) return 0;
		const dt = (fix.timestamp - lastFix.timestamp) / 1000;
		if (dt <= 0.2) return targetSpeedMs;
		return haversineM(lastFix.coords, fix.coords) / dt;
	}

	function addPoint(fix: GeoFix) {
		if (fix.accuracyM !== null && fix.accuracyM > ACCURACY_REJECT_M) return;

		targetSpeedMs = instantSpeedMs(fix);
		if (targetSpeedMs < STOPPED_MS) {
			targetSpeedMs = 0;
			speedMs = 0;
		}

		const last = trackedPath[trackedPath.length - 1];
		if (!last) {
			trackedPath = [fix.coords];
		} else {
			const d = haversineM(last, fix.coords);
			const preciseEnough = fix.accuracyM === null || fix.accuracyM <= ACCURACY_DISTANCE_M;
			if (d >= MIN_STEP_M && preciseEnough && targetSpeedMs >= STOPPED_MS) {
				distanceM += d;
				trackedPath = [...trackedPath, fix.coords];
			}
		}

		currentPosition = fix.coords;
		lastFix = fix;
		lastFixAt = Date.now();
		checkOffRoute(fix.coords);
	}

	function tickSpeed() {
		const stale = Date.now() - lastFixAt > SPEED_STALE_MS;
		const goal = stale ? 0 : targetSpeedMs;
		speedMs += (goal - speedMs) * SPEED_ALPHA;
		if (speedMs < STOPPED_MS) speedMs = 0;
	}

	function start(options?: TrackingOptions) {
		active = true;
		trackedPath = [];
		distanceM = 0;
		speedMs = 0;
		targetSpeedMs = 0;
		lastFix = null;
		lastFixAt = Date.now();
		startTime = Date.now();
		elapsed = 0;
		rerouteNotified = false;
		plannedRoute = options?.plannedRoute ?? [];
		onReroute = options?.onReroute ?? null;
		inApproach = !!options?.approachRoute?.length;
		routeOrigin = options?.routeOrigin ?? null;
		onApproachComplete = options?.onApproachComplete ?? null;

		const cached = getLastPosition();
		if (cached) {
			currentPosition = cached;
			trackedPath = [cached];
		}

		timerInterval = setInterval(() => {
			elapsed = Math.floor((Date.now() - startTime) / 1000);
		}, 1000);
		speedInterval = setInterval(tickSpeed, SPEED_TICK_MS);

		startBackgroundWatch({ onPosition: addPoint, onError() {} });
	}

	function updatePlannedRoute(route: LatLng[]) {
		plannedRoute = route;
		rerouteNotified = false;
	}

	function stop(): { path: LatLng[]; distanceKm: number; durationMinutes: number } {
		clearInterval(timerInterval);
		clearInterval(speedInterval);
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
		speedMs = 0;
		targetSpeedMs = 0;
		lastFix = null;
		elapsed = 0;
		plannedRoute = [];
		onReroute = null;
		inApproach = false;
		routeOrigin = null;
		onApproachComplete = null;
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
	let speedKmh = $derived(speedMs * 3.6);

	return {
		get active() { return active; },
		get trackedPath() { return trackedPath; },
		get currentPosition() { return currentPosition; },
		get plannedRoute() { return plannedRoute; },
		get inApproach() { return inApproach; },
		get distanceKm() { return distanceKm; },
		get elapsedFormatted() { return elapsedFormatted; },
		get speedKmh() { return speedKmh; },
		start,
		stop,
		updatePlannedRoute
	};
}
