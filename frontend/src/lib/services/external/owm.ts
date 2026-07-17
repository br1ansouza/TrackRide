const OWM_URL = 'https://api.openweathermap.org/data/2.5/forecast';

export function forecastUrl(lat: number, lon: number, apiKey: string): string {
	return `${OWM_URL}?lat=${lat}&lon=${lon}&units=metric&lang=pt_br&appid=${apiKey}`;
}
