import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
	appId: 'com.trackride.app',
	appName: 'TrackRide',
	webDir: 'build/client',
	server: {
		url: 'http://YOUR_LOCAL_IP:4173',
		cleartext: true
	}
};

export default config;
