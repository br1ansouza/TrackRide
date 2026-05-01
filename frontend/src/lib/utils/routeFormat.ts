export function formatTime(minutes: number): string {
	if (minutes < 60) return `${minutes} min`;
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function formatArrival(minutes: number): string {
	if (minutes === 0) return 'Agora';
	const arrival = new Date(Date.now() + minutes * 60000);
	return `~${arrival.getHours().toString().padStart(2, '0')}:${arrival.getMinutes().toString().padStart(2, '0')}`;
}
