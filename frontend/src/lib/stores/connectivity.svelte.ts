import { API_ORIGIN } from '$lib/services/api';

const PROBE_TIMEOUT_MS = 4000;
const OFFLINE_RECHECK_MS = 30000;

let online = $state(true);
let bound = false;

async function probe(): Promise<boolean> {
	try {
		await fetch(`${API_ORIGIN}/up`, { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
		return true;
	} catch {
		return false;
	}
}

async function checkNow(): Promise<boolean> {
	online = await probe();
	return online;
}

function markOffline(): void {
	online = false;
}

export function useConnectivity() {
	if (!bound && typeof window !== 'undefined') {
		bound = true;
		online = navigator.onLine;
		window.addEventListener('online', () => { checkNow(); });
		window.addEventListener('offline', markOffline);
		setInterval(() => { if (!online) checkNow(); }, OFFLINE_RECHECK_MS);
		checkNow();
	}
	return {
		get online() { return online; },
		checkNow,
		markOffline
	};
}
