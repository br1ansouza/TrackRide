import { version } from '../../../package.json';

export const latestRelease = {
	version: version.replace(/\.0$/, ''),
	notes: [
		'Telas de acesso redesenhadas',
		'Novos marcadores de rota e paradas',
		'Mapa atualizado para o MapLibre 6'
	]
} as const;
