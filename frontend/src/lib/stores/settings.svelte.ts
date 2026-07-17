const AUTO_OFFLINE_MAPS_KEY = 'trackride:auto-offline-maps';

let autoOfflineMaps = $state(
	typeof localStorage !== 'undefined' && localStorage.getItem(AUTO_OFFLINE_MAPS_KEY) === '1'
);

export function useSettings() {
	return {
		get autoOfflineMaps() { return autoOfflineMaps; },
		setAutoOfflineMaps(value: boolean) {
			autoOfflineMaps = value;
			localStorage.setItem(AUTO_OFFLINE_MAPS_KEY, value ? '1' : '0');
		}
	};
}
