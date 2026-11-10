import type {
	BackgroundGeolocationPlugin,
	Location,
	CallbackError
} from '@capacitor-community/background-geolocation';
import type { LatLng } from './routing';

let bgPlugin: BackgroundGeolocationPlugin | null = null;

async function getBackgroundGeolocation(): Promise<BackgroundGeolocationPlugin> {
	if (!bgPlugin) {
		const { registerPlugin } = await import('@capacitor/core');
		bgPlugin = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');
	}
	return bgPlugin;
}

export interface GeoFix {
	coords: LatLng;
	accuracyM: number | null;
	speedMs: number | null;
	bearingDeg: number | null;
	timestamp: number;
}

interface GeoCallbacks {
	onPosition: (fix: GeoFix) => void;
	onError: (message: string) => void;
}

interface PositionLike {
	timestamp: number;
	coords: {
		latitude: number;
		longitude: number;
		accuracy: number | null;
		speed: number | null;
		heading: number | null;
	};
}

function toFix(pos: PositionLike): GeoFix {
	return {
		coords: [pos.coords.latitude, pos.coords.longitude],
		accuracyM: pos.coords.accuracy,
		speedMs: pos.coords.speed,
		bearingDeg: pos.coords.heading,
		timestamp: pos.timestamp
	};
}

let watchId: string | number | null = null;
let bgWatcherId: string | null = null;
let backgroundWebWatchId: number | null = null;
let backgroundFallbackId: string | null = null;
let backgroundGeneration = 0;

const LAST_POSITION_KEY = 'trackride:last-position';
const LAST_POSITION_MAX_AGE_MS = 30 * 60 * 1000;

type StoredPosition = { coords: LatLng; savedAt: number };

function isLatLng(value: unknown): value is LatLng {
	return (
		Array.isArray(value) &&
		value.length === 2 &&
		Number.isFinite(value[0]) &&
		Number.isFinite(value[1])
	);
}

export function getLastPosition(maxAgeMs: number = LAST_POSITION_MAX_AGE_MS): LatLng | null {
	try {
		const raw = localStorage.getItem(LAST_POSITION_KEY);
		if (!raw) return null;
		const parsed: unknown = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
		const stored = parsed as Partial<StoredPosition>;
		if (!isLatLng(stored.coords) || typeof stored.savedAt !== 'number') return null;
		if (Date.now() - stored.savedAt > maxAgeMs) return null;
		return stored.coords;
	} catch {}
	return null;
}

function savePosition(coords: LatLng): void {
	const stored: StoredPosition = { coords, savedAt: Date.now() };
	localStorage.setItem(LAST_POSITION_KEY, JSON.stringify(stored));
}

function geoError(code: number): string {
	const messages: Record<number, string> = {
		1: 'Permissão de localização negada.',
		2: 'Não foi possível obter sua localização.',
		3: 'Tempo esgotado ao buscar localização.'
	};
	return messages[code] ?? 'Erro ao buscar localização.';
}

async function waitForCapacitor(): Promise<boolean> {
	if (typeof window === 'undefined') return false;
	const { Capacitor } = await import('@capacitor/core');
	if (Capacitor.isNativePlatform()) return true;
	if (!('AndroidBridge' in window || 'webkit' in window)) return false;
	for (let i = 0; i < 10; i++) {
		await new Promise((r) => setTimeout(r, 300));
		if (Capacitor.isNativePlatform()) return true;
	}
	return false;
}

export async function getCurrentPosition(callbacks: GeoCallbacks): Promise<void> {
	const isNative = await waitForCapacitor();

	if (isNative) {
		try {
			const { Geolocation } = await import('@capacitor/geolocation');
			const pos = await Geolocation.getCurrentPosition({
				enableHighAccuracy: true,
				timeout: 10000
			});
			const fix = toFix(pos);
			savePosition(fix.coords);
			callbacks.onPosition(fix);
		} catch {
			callbacks.onError('Não foi possível obter sua localização.');
		}
		return;
	}

	navigator.geolocation.getCurrentPosition(
		(pos) => {
			const fix = toFix(pos);
			savePosition(fix.coords);
			callbacks.onPosition(fix);
		},
		(err) => callbacks.onError(geoError(err.code)),
		{ enableHighAccuracy: false, timeout: 10000 }
	);
}

export async function watchPosition(callbacks: GeoCallbacks): Promise<void> {
	const isNative = await waitForCapacitor();

	if (isNative) {
		try {
			const { Geolocation } = await import('@capacitor/geolocation');
			watchId = await Geolocation.watchPosition({ enableHighAccuracy: true }, (pos, err) => {
				if (err || !pos) return;
				const fix = toFix(pos);
				savePosition(fix.coords);
				callbacks.onPosition(fix);
			});
		} catch {
			callbacks.onError('Não foi possível rastrear sua localização.');
		}
		return;
	}

	watchId = watchBrowserPosition(callbacks);
}

function watchBrowserPosition(callbacks: GeoCallbacks): number {
	return navigator.geolocation.watchPosition(
		(pos) => {
			const fix = toFix(pos);
			savePosition(fix.coords);
			callbacks.onPosition(fix);
		},
		(err) => callbacks.onError(geoError(err.code)),
		{ enableHighAccuracy: true }
	);
}

export async function clearWatch(): Promise<void> {
	if (watchId === null) return;

	const isNative = await waitForCapacitor();
	if (isNative && typeof watchId === 'string') {
		const { Geolocation } = await import('@capacitor/geolocation');
		await Geolocation.clearWatch({ id: watchId });
	} else if (typeof watchId === 'number') {
		navigator.geolocation.clearWatch(watchId);
	}
	watchId = null;
}

async function requestNotificationPermission(): Promise<void> {
	try {
		const { LocalNotifications } = await import('@capacitor/local-notifications');
		const { display } = await LocalNotifications.checkPermissions();
		if (display !== 'granted') {
			await LocalNotifications.requestPermissions();
		}
	} catch {}
}

export async function startBackgroundWatch(callbacks: GeoCallbacks): Promise<void> {
	const generation = ++backgroundGeneration;
	const isNative = await waitForCapacitor();
	if (generation !== backgroundGeneration) return;
	if (!isNative) {
		backgroundWebWatchId = watchBrowserPosition(callbacks);
		return;
	}
	await requestNotificationPermission();
	if (generation !== backgroundGeneration) return;
	try {
		const bg = await getBackgroundGeolocation();
		const id = await bg.addWatcher(
			{
				backgroundMessage: 'Rota em andamento',
				backgroundTitle: 'TrackRide',
				requestPermissions: true,
				stale: false,
				distanceFilter: 0
			},
			(location?: Location, error?: CallbackError) => {
				if (generation !== backgroundGeneration) return;
				if (error) {
					callbacks.onError(error.message ?? 'Erro de GPS');
					return;
				}
				if (!location) return;
				const fix: GeoFix = {
					coords: [location.latitude, location.longitude],
					accuracyM: location.accuracy ?? null,
					speedMs: location.speed,
					bearingDeg: location.bearing,
					timestamp: location.time ?? Date.now()
				};
				savePosition(fix.coords);
				callbacks.onPosition(fix);
			}
		);
		if (generation !== backgroundGeneration) await bg.removeWatcher({ id });
		else bgWatcherId = id;
	} catch {
		if (generation !== backgroundGeneration) return;
		try {
			const { Geolocation } = await import('@capacitor/geolocation');
			const id = await Geolocation.watchPosition({ enableHighAccuracy: true }, (pos, err) => {
				if (generation !== backgroundGeneration) return;
				if (err || !pos) {
					callbacks.onError('Não foi possível rastrear sua localização.');
					return;
				}
				const fix = toFix(pos);
				savePosition(fix.coords);
				callbacks.onPosition(fix);
			});
			if (generation !== backgroundGeneration) await Geolocation.clearWatch({ id });
			else backgroundFallbackId = id;
		} catch {
			callbacks.onError('Não foi possível rastrear sua localização.');
		}
	}
}

export async function stopBackgroundWatch(): Promise<void> {
	++backgroundGeneration;
	const id = bgWatcherId;
	const fallbackId = backgroundFallbackId;
	bgWatcherId = null;
	backgroundFallbackId = null;
	if (backgroundWebWatchId !== null) {
		navigator.geolocation.clearWatch(backgroundWebWatchId);
		backgroundWebWatchId = null;
	}
	if (id !== null) {
		try {
			const bg = await getBackgroundGeolocation();
			await bg.removeWatcher({ id });
		} catch {}
	}
	if (fallbackId !== null) {
		try {
			const { Geolocation } = await import('@capacitor/geolocation');
			await Geolocation.clearWatch({ id: fallbackId });
		} catch {}
	}
}
