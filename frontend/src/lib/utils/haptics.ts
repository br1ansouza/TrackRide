import { Haptics, ImpactStyle } from '@capacitor/haptics';

export async function vibrate(): Promise<void> {
	try {
		await Haptics.impact({ style: ImpactStyle.Light });
	} catch {
		navigator.vibrate?.(15);
	}
}

export async function vibrateHeavy(): Promise<void> {
	try {
		await Haptics.impact({ style: ImpactStyle.Heavy });
	} catch {
		navigator.vibrate?.(30);
	}
}
