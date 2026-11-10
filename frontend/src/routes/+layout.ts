import { isStandaloneBuild } from '#lib/utils/platform.js';

export const ssr = !isStandaloneBuild;
