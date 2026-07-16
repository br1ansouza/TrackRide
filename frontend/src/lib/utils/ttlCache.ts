interface CacheEntry<T> {
	value: T;
	expiresAt: number;
}

export class TtlCache<T = string> {
	#store = new Map<string, CacheEntry<T>>();
	#ttlMs: number;
	#maxEntries: number;

	constructor(ttlMs: number, maxEntries: number) {
		this.#ttlMs = ttlMs;
		this.#maxEntries = maxEntries;
	}

	get(key: string): T | null {
		const entry = this.#store.get(key);
		if (!entry) return null;
		if (Date.now() > entry.expiresAt) {
			this.#store.delete(key);
			return null;
		}
		return entry.value;
	}

	set(key: string, value: T): void {
		if (this.#store.size >= this.#maxEntries) {
			const now = Date.now();
			for (const [k, v] of this.#store) {
				if (now > v.expiresAt) this.#store.delete(k);
			}
			if (this.#store.size >= this.#maxEntries) this.#store.clear();
		}
		this.#store.set(key, { value, expiresAt: Date.now() + this.#ttlMs });
	}
}
