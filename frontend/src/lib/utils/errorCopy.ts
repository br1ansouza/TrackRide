export type ErrorCopy = {
	eyebrow: string;
	title: string;
	description: string;
	retryable: boolean;
};

export const OFFLINE_COPY: ErrorCopy = {
	eyebrow: 'Sem conexão',
	title: 'Você está offline',
	description:
		'Não foi possível carregar esta tela porque o aparelho está sem internet. As rotas já baixadas continuam disponíveis.',
	retryable: true
};

export function copyForStatus(status: number): ErrorCopy {
	if (status === 404) {
		return {
			eyebrow: 'Erro 404',
			title: 'Página não encontrada',
			description: 'O endereço que você abriu não existe ou foi movido. Confira o link e tente de novo.',
			retryable: false
		};
	}
	if (status === 401 || status === 403) {
		return {
			eyebrow: `Erro ${status}`,
			title: 'Acesso não autorizado',
			description: 'Sua sessão pode ter expirado. Entre de novo para continuar de onde parou.',
			retryable: false
		};
	}
	if (status === 502 || status === 503 || status === 504) {
		return {
			eyebrow: `Erro ${status}`,
			title: 'Servidor indisponível',
			description:
				'O servidor hiberna quando fica sem uso e pode levar até um minuto para acordar. Tente de novo em instantes.',
			retryable: true
		};
	}
	return {
		eyebrow: status ? `Erro ${status}` : 'Erro',
		title: 'Algo deu errado',
		description: 'Não conseguimos carregar esta tela. Tente de novo ou volte para o início.',
		retryable: true
	};
}
