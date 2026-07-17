export const isStandaloneBuild = import.meta.env.VITE_STANDALONE === '1';

export const standaloneApiHost: string | undefined = import.meta.env.VITE_API_HOST;

export const standaloneOwmKey: string | undefined = import.meta.env.VITE_OWM_KEY;
