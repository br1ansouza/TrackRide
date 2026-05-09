import type { BackgroundGeolocationPlugin, Location, CallbackError } from '@capacitor-community/background-geolocation';
import type { LatLng } from './routing';

let bgPlugin: BackgroundGeolocationPlugin | null = null;

async function getBackgroundGeolocation(): Promise<BackgroundGeolocationPlugin> {
	if (!bgPlugin) {
		const { Capacitor } = await import('@capacitor/core');
		bgPlugin = Capacitor.Plugins.BackgroundGeolocation as BackgroundGeolocationPlugin;
	}
	return bgPlugin;
}

interface GeoCallbacks {
	onPosition: (coords: LatLng) => void;
	onError: (message: string) => void;
}

let watchId: string | number | null = null;
let bgWatcherId: string | null = null;

const LAST_POSITION_KEY = 'trackride:last-position';

export function getLastPosition(): LatLng | null {
	try {
		const raw = localStorage.getItem(LAST_POSITION_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as LatLng;
		if (Array.isArray(parsed) && parsed.length === 2) return parsed;
	} catch {}
	return null;
}

function savePosition(coords: LatLng): void {
	localStorage.setItem(LAST_POSITION_KEY, JSON.stringify(coords));
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
	if ('Capacitor' in window) return true;
	if (!('AndroidBridge' in window || 'webkit' in window)) return false;
	for (let i = 0; i < 10; i++) {
		await new Promise((r) => setTimeout(r, 300));
		if ('Capacitor' in window) return true;
	}
	return false;
}

export async function getCurrentPosition(callbacks: GeoCallbacks): Promise<void> {
	const isNative = await waitForCapacitor();

	if (isNative) {
		try {
			const { Geolocation } = await import('@capacitor/geolocation');
			const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
			const coords: LatLng = [pos.coords.latitude, pos.coords.longitude];
			savePosition(coords);
			callbacks.onPosition(coords);
		} catch {
			callbacks.onError('Não foi possível obter sua localização.');
		}
		return;
	}

	navigator.geolocation.getCurrentPosition(
		(pos) => {
			const coords: LatLng = [pos.coords.latitude, pos.coords.longitude];
			savePosition(coords);
			callbacks.onPosition(coords);
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
				const coords: LatLng = [pos.coords.latitude, pos.coords.longitude];
				savePosition(coords);
				callbacks.onPosition(coords);
			});
		} catch {
			callbacks.onError('Não foi possível rastrear sua localização.');
		}
		return;
	}

	watchId = navigator.geolocation.watchPosition(
		(pos) => {
			const coords: LatLng = [pos.coords.latitude, pos.coords.longitude];
			savePosition(coords);
			callbacks.onPosition(coords);
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
	const isNative = await waitForCapacitor();
	if (!isNative) {
		watchPosition(callbacks);
		return;
	}

	await requestNotificationPermission();

	try {
		const bg = await getBackgroundGeolocation();
		const callbackId = bg.addWatcher(
			{
				backgroundMessage: 'Rota em andamento',
				backgroundTitle: 'TrackRide',
				requestPermissions: true,
				stale: false,
				distanceFilter: 5
			},
			(location?: Location, error?: CallbackError) => {
				if (error) {
					if (error.code !== 'NOT_AUTHORIZED') callbacks.onError(error.message ?? 'Erro de GPS');
					return;
				}
				if (!location) return;
				const coords: LatLng = [location.latitude, location.longitude];
				savePosition(coords);
				callbacks.onPosition(coords);
			}
		);
		if (callbackId && typeof callbackId.then === 'function') {
			callbackId.then((id: string) => { bgWatcherId = id; });
		} else {
			bgWatcherId = callbackId as unknown as string;
		}
	} catch {
		watchPosition(callbacks);
	}
}

export async function stopBackgroundWatch(): Promise<void> {
	if (bgWatcherId !== null) {
		try {
			const bg = await getBackgroundGeolocation();
			bg.removeWatcher({ id: bgWatcherId });
		} catch {}
		bgWatcherId = null;
		return;
	}
	await clearWatch();
}
