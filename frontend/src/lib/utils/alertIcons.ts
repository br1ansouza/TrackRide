import { CloudRain, Wind, Eye } from 'lucide-svelte';
import type { AlertType } from '$lib/services/alerts';
import { cssVar } from '$lib/utils/color';

export const ALERT_ICONS: Record<AlertType, typeof CloudRain> = {
	rain: CloudRain,
	wind: Wind,
	visibility: Eye
};

export function alertColor(severity: 'warning' | 'danger'): string {
	return cssVar(severity === 'danger' ? '--color-ride-danger-300' : '--color-ride-alert-300');
}
