interface RetryOptions {
	retries?: number;
	delayMs?: number;
	label?: string;
}

export async function fetchWithRetry(
	input: string,
	init: RequestInit = {},
	{ retries = 2, delayMs = 1000, label = 'fetch' }: RetryOptions = {}
): Promise<Response | null> {
	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			const response = await fetch(input, init);
			if (response.ok) return response;
			console.error(`${label} respondeu ${response.status} (tentativa ${attempt + 1})`);
		} catch (error) {
			console.error(`${label} falhou (tentativa ${attempt + 1}):`, error);
		}
		if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
	}
	return null;
}
