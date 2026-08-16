import { version } from '../../../package.json';

export const latestRelease = {
	version: version.replace(/\.0$/, ''),
	notes: [
		'Nova identidade nas telas de acesso e perfil.',
		'Marcadores de rota redesenhados para leitura mais rápida.',
		'Melhorias de estabilidade no mapa e no uso offline.'
	]
} as const;
