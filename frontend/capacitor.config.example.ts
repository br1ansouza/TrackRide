import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
	appId: 'com.trackride.app',
	appName: 'TrackRide',
	webDir: 'build-standalone',
	server: {
		androidScheme: 'http',
		cleartext: true
	}
};

export default config;
