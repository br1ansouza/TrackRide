import { THRESHOLDS } from './alerts';
import type { WeatherPoint } from './weather';

export interface RouteScore {
	value: number;
	label: string;
	color: 'safe' | 'alert' | 'danger';
}

function pointPenalty(point: WeatherPoint): number {
	let penalty = 0;

	if (point.rain >= THRESHOLDS.rain.danger) penalty += 40;
	else if (point.rain >= THRESHOLDS.rain.warning) penalty += 20;

	if (point.windSpeed >= THRESHOLDS.wind.danger) penalty += 30;
	else if (point.windSpeed >= THRESHOLDS.wind.warning) penalty += 15;

	if (point.visibility <= THRESHOLDS.visibility.danger) penalty += 30;
	else if (point.visibility <= THRESHOLDS.visibility.warning) penalty += 15;

	return Math.min(penalty, 100);
}

function scoreLabel(value: number): { label: string; color: RouteScore['color'] } {
	if (value >= 75) return { label: 'Boa para rodar', color: 'safe' };
	if (value >= 50) return { label: 'Atenção em trechos', color: 'alert' };
	return { label: 'Condições adversas', color: 'danger' };
}

export function calculateRouteScore(points: WeatherPoint[]): RouteScore {
	if (points.length === 0) return { value: 100, label: 'Sem dados', color: 'safe' };

	const avgPenalty = points.reduce((sum, p) => sum + pointPenalty(p), 0) / points.length;
	const value = Math.round(Math.max(0, 100 - avgPenalty));
	const { label, color } = scoreLabel(value);

	return { value, label, color };
}
