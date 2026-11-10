import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	OPENWEATHERMAP_API_KEY: { schema: (input) => input ?? '' }
});
