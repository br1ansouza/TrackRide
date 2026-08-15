export const isStandaloneBuild = import.meta.env.VITE_STANDALONE === '1';

export const standaloneApiHost: string | undefined = import.meta.env.VITE_API_HOST;

export const configuredApiUrl: string | undefined = import.meta.env.VITE_API_URL;

export const proxyBaseUrl: string = import.meta.env.VITE_PROXY_URL ?? '';
