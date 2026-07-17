import { isStandaloneBuild } from '$lib/utils/platform';

export const ssr = !isStandaloneBuild;
