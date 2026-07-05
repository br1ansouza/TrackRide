import { THRESHOLDS, classifyNight, classifyCold, classifyHeat } from './alerts';
import type { WeatherPoint } from './weather';

export type RidingPreference = 'calm' | 'mixed' | 'sport';

export interface RouteScore {
	value: number;
	label: string;
	color: 'safe' | 'alert' | 'danger';
}

const PREFERENCE_MULTIPLIER: Record<RidingPreference, number> = {
	calm: 0.8,
	mixed: 1.0,
	sport: 1.3
};

function weatherPenalty(point: WeatherPoint): number {
	let penalty = 0;

	if (point.rain >= THRESHOLDS.rain.danger) penalty += 40;
	else if (point.rain >= THRESHOLDS.rain.warning) penalty += 20;

	if (point.windSpeed >= THRESHOLDS.wind.danger) penalty += 30;
	else if (point.windSpeed >= THRESHOLDS.wind.warning) penalty += 15;

	if (point.visibility <= THRESHOLDS.visibility.danger) penalty += 30;
	else if (point.visibility <= THRESHOLDS.visibility.warning) penalty += 15;

	const cold = classifyCold(point.feelsLike);
	if (cold === 'danger') penalty += 30;
	else if (cold === 'warning') penalty += 15;

	const heat = classifyHeat(point.feelsLike);
	if (heat === 'danger') penalty += 25;
	else if (heat === 'warning') penalty += 12;

	return Math.min(penalty, 100);
}

function nightPenalty(point: WeatherPoint): number {
	return classifyNight(point.estimatedMinutes) !== null ? 15 : 0;
}

function scoreLabel(value: number): { label: string; color: RouteScore['color'] } {
	if (value >= 80) return { label: 'Boa para rodar', color: 'safe' };
	if (value >= 55) return { label: 'Atenção em trechos', color: 'alert' };
	return { label: 'Condições adversas', color: 'danger' };
}

export function calculateRouteScore(points: WeatherPoint[], preference: RidingPreference = 'mixed'): RouteScore {
	if (points.length === 0) return { value: 100, label: 'Sem dados', color: 'safe' };

	const multiplier = PREFERENCE_MULTIPLIER[preference];
	const weatherPenalties = points.map((p) => Math.min(weatherPenalty(p) * multiplier, 100));
	const nightPenalties = points.map(nightPenalty);

	const avgWeather = weatherPenalties.reduce((sum, p) => sum + p, 0) / points.length;
	const worstWeather = Math.max(...weatherPenalties);
	const affectedCount = weatherPenalties.filter((p) => p > 0).length;
	const affectedRatio = affectedCount / points.length;
	const avgNight = nightPenalties.reduce((sum, p) => sum + p, 0) / points.length;

	const scaledAffected = Math.min(affectedCount * 4, 40);

	const combined =
		avgWeather * 0.3 +
		worstWeather * 0.3 +
		affectedRatio * 100 * 0.15 +
		scaledAffected +
		avgNight;

	const value = Math.round(Math.max(0, Math.min(100, 100 - combined)));
	const { label, color } = scoreLabel(value);

	return { value, label, color };
}
