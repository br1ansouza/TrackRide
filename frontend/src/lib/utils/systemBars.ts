import { Capacitor, SystemBars } from '@capacitor/core';

export async function hideSystemBars(): Promise<void> {
	if (!Capacitor.isNativePlatform()) return;
	try {
		await SystemBars.hide();
	} catch {}
}
