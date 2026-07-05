import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { NavigationBar } from '@hugotomazi/capacitor-navigation-bar';

export async function hideSystemBars(): Promise<void> {
	if (!Capacitor.isNativePlatform()) return;
	try {
		await StatusBar.hide();
		await NavigationBar.hide();
	} catch {}
}
