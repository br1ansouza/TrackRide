import type { WeatherPoint } from './weather';

export type AlertSeverity = 'warning' | 'danger';
export type AlertType = 'rain' | 'wind' | 'visibility' | 'night';

export interface RouteAlert {
	type: AlertType;
	severity: AlertSeverity;
	message: string;
	points: WeatherPoint[];
	exposureKm: number;
	exposureMinutes: number;
}

export const THRESHOLDS = {
	rain: { warning: 2.5, danger: 7.5 },
	wind: { warning: 10, danger: 17 },
	visibility: { warning: 5000, danger: 1000 }
} as const;

function classifyRain(rain: number): AlertSeverity | null {
	if (rain >= THRESHOLDS.rain.danger) return 'danger';
	if (rain >= THRESHOLDS.rain.warning) return 'warning';
	return null;
}

function classifyWind(speed: number): AlertSeverity | null {
	if (speed >= THRESHOLDS.wind.danger) return 'danger';
	if (speed >= THRESHOLDS.wind.warning) return 'warning';
	return null;
}

function classifyVisibility(visibility: number): AlertSeverity | null {
	if (visibility <= THRESHOLDS.visibility.danger) return 'danger';
	if (visibility <= THRESHOLDS.visibility.warning) return 'warning';
	return null;
}

const MESSAGES: Record<AlertType, Record<AlertSeverity, { short: string; long: string }>> = {
	rain: {
		warning: { short: 'Chuva moderada', long: 'Chuva moderada em trechos da rota' },
		danger: { short: 'Chuva forte', long: 'Chuva forte em trechos da rota' }
	},
	wind: {
		warning: { short: 'Vento forte', long: 'Vento forte em trechos da rota' },
		danger: { short: 'Vento muito forte', long: 'Vento muito forte em trechos da rota' }
	},
	visibility: {
		warning: { short: 'Visibilidade reduzida', long: 'Visibilidade reduzida em trechos da rota' },
		danger: { short: 'Visibilidade muito baixa', long: 'Visibilidade muito baixa em trechos da rota' }
	},
	night: {
		warning: { short: 'Trecho noturno', long: 'Trechos noturnos na rota' },
		danger: { short: 'Trecho noturno', long: 'Trechos noturnos na rota' }
	}
};

export interface PointAlert {
	type: AlertType;
	severity: AlertSeverity;
	message: string;
}

export function classifyNight(estimatedMinutes: number): AlertSeverity | null {
	const arrival = new Date(Date.now() + estimatedMinutes * 60000);
	const hour = arrival.getHours();
	return (hour >= 19 || hour < 6) ? 'warning' : null;
}

export function classifyPoint(point: WeatherPoint): PointAlert[] {
	const result: PointAlert[] = [];
	const rain = classifyRain(point.rain);
	if (rain) result.push({ type: 'rain', severity: rain, message: MESSAGES.rain[rain].short });
	const wind = classifyWind(point.windSpeed);
	if (wind) result.push({ type: 'wind', severity: wind, message: MESSAGES.wind[wind].short });
	const vis = classifyVisibility(point.visibility);
	if (vis) result.push({ type: 'visibility', severity: vis, message: MESSAGES.visibility[vis].short });
	const night = classifyNight(point.estimatedMinutes);
	if (night) result.push({ type: 'night', severity: night, message: MESSAGES.night[night].short });
	return result;
}

function formatExposure(km: number, minutes: number): string {
	if (minutes < 60) return `~${km} km (~${minutes} min)`;
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	const time = m > 0 ? `${h}h ${m}min` : `${h}h`;
	return `~${km} km (~${time})`;
}

export function analyzeRoute(points: WeatherPoint[]): RouteAlert[] {
	const classifiers: Record<AlertType, (p: WeatherPoint) => AlertSeverity | null> = {
		rain: (p) => classifyRain(p.rain),
		wind: (p) => classifyWind(p.windSpeed),
		visibility: (p) => classifyVisibility(p.visibility),
		night: (p) => classifyNight(p.estimatedMinutes)
	};

	const alerts: RouteAlert[] = [];
	const types: AlertType[] = ['rain', 'wind', 'visibility', 'night'];

	for (const type of types) {
		const affected = points.filter((p) => classifiers[type](p) !== null);
		if (affected.length === 0) continue;

		const hasDanger = affected.some((p) => classifiers[type](p) === 'danger');
		const severity: AlertSeverity = hasDanger ? 'danger' : 'warning';

		const firstKm = Math.min(...affected.map((p) => p.distanceKm));
		const lastKm = Math.max(...affected.map((p) => p.distanceKm));
		const firstMin = Math.min(...affected.map((p) => p.estimatedMinutes));
		const lastMin = Math.max(...affected.map((p) => p.estimatedMinutes));
		const exposureKm = Math.round(lastKm - firstKm);
		const exposureMinutes = Math.round(lastMin - firstMin);

		const base = MESSAGES[type][severity].long;
		let message: string;
		if (exposureKm > 0) {
			message = `${base} por ${formatExposure(exposureKm, exposureMinutes)}`;
		} else {
			message = `${base} (${affected.length} ${affected.length === 1 ? 'ponto' : 'pontos'})`;
		}

		alerts.push({ type, severity, message, points: affected, exposureKm, exposureMinutes });
	}

	return alerts;
}
