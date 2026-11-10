import { wakeUpApi } from '$lib/services/api';
import { apiStatus } from './apiStatus.svelte';
let online = $state(true);
let bound = false;

async function checkNow(): Promise<boolean> {
	online = navigator.onLine;
	if (!online) {
		apiStatus.state = 'offline';
		return false;
	}
	return wakeUpApi();
}
export function useConnectivity() {
	if (!bound && typeof window !== 'undefined') {
		bound = true;
		online = navigator.onLine;
		window.addEventListener('online', () => {
			void checkNow();
		});
		window.addEventListener('offline', () => {
			online = false;
			apiStatus.state = 'offline';
		});
		window.addEventListener('focus', () => {
			void checkNow();
		});
		document.addEventListener('visibilitychange', () => {
			if (!document.hidden) void checkNow();
		});
		setInterval(() => {
			if (!document.hidden && apiStatus.state !== 'ready') void checkNow();
		}, 15000);
		void checkNow();
	}
	return {
		get online() {
			return online;
		},
		get serverReady() {
			return online && apiStatus.state === 'ready';
		},
		checkNow
	};
}
