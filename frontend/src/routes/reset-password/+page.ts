import type { LoadEvent } from '@sveltejs/kit';

export function load({ url }: LoadEvent) {
	return { token: url.searchParams.get('token') ?? '' };
}
