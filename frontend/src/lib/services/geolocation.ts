import type { LatLng } from './routing';

interface GeoCallbacks {
	onPosition: (coords: LatLng) => void;
	onError: (message: string) => void;
}

let watchId: string | number | null = null;

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
