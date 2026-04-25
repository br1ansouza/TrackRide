import type { WeatherPoint } from './weather';

export type AlertSeverity = 'warning' | 'danger';
export type AlertType = 'rain' | 'wind' | 'visibility';

export interface RouteAlert {
	type: AlertType;
	severity: AlertSeverity;
	message: string;
	points: WeatherPoint[];
}

const THRESHOLDS = {
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

const MESSAGES: Record<AlertType, Record<AlertSeverity, string>> = {
	rain: {
		warning: 'Chuva moderada em trechos da rota',
		danger: 'Chuva forte em trechos da rota'
	},
	wind: {
		warning: 'Vento forte em trechos da rota',
		danger: 'Vento muito forte em trechos da rota'
	},
	visibility: {
		warning: 'Visibilidade reduzida em trechos da rota',
		danger: 'Visibilidade muito baixa em trechos da rota'
	}
};

const POINT_MESSAGES: Record<AlertType, Record<AlertSeverity, string>> = {
	rain: { warning: 'Chuva moderada', danger: 'Chuva forte' },
	wind: { warning: 'Vento forte', danger: 'Vento muito forte' },
	visibility: { warning: 'Visibilidade reduzida', danger: 'Visibilidade muito baixa' }
};

export interface PointAlert {
	type: AlertType;
	severity: AlertSeverity;
	message: string;
}

export function classifyPoint(point: WeatherPoint): PointAlert[] {
	const result: PointAlert[] = [];
	const rain = classifyRain(point.rain);
	if (rain) result.push({ type: 'rain', severity: rain, message: POINT_MESSAGES.rain[rain] });
	const wind = classifyWind(point.windSpeed);
	if (wind) result.push({ type: 'wind', severity: wind, message: POINT_MESSAGES.wind[wind] });
	const vis = classifyVisibility(point.visibility);
	if (vis) result.push({ type: 'visibility', severity: vis, message: POINT_MESSAGES.visibility[vis] });
	return result;
}

export function analyzeRoute(points: WeatherPoint[]): RouteAlert[] {
	const groups: Record<AlertType, { warning: WeatherPoint[]; danger: WeatherPoint[] }> = {
		rain: { warning: [], danger: [] },
		wind: { warning: [], danger: [] },
		visibility: { warning: [], danger: [] }
	};

	for (const point of points) {
		const rainSev = classifyRain(point.rain);
		if (rainSev) groups.rain[rainSev].push(point);

		const windSev = classifyWind(point.windSpeed);
		if (windSev) groups.wind[windSev].push(point);

		const visSev = classifyVisibility(point.visibility);
		if (visSev) groups.visibility[visSev].push(point);
	}

	const alerts: RouteAlert[] = [];
	const types: AlertType[] = ['rain', 'wind', 'visibility'];

	for (const type of types) {
		const group = groups[type];
		const severity: AlertSeverity = group.danger.length > 0 ? 'danger' : 'warning';
		const allPoints = [...group.danger, ...group.warning];
		if (allPoints.length > 0) {
			alerts.push({ type, severity, message: MESSAGES[type][severity], points: allPoints });
		}
	}

	return alerts;
}
