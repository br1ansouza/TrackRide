const DB_NAME = 'trackride';
const DB_VERSION = 2;
const STORE_NAMES = ['route-packs', 'sync-queue', 'tiles', 'cache'] as const;

export type StoreName = (typeof STORE_NAMES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
	if (!dbPromise) {
		dbPromise = new Promise((resolve, reject) => {
			const request = indexedDB.open(DB_NAME, DB_VERSION);
			request.onupgradeneeded = () => {
				for (const name of STORE_NAMES) {
					if (!request.result.objectStoreNames.contains(name)) {
						request.result.createObjectStore(name);
					}
				}
			};
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}
	return dbPromise;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

export async function idbGet<T>(store: StoreName, key: string): Promise<T | undefined> {
	const db = await openDb();
	return requestToPromise(db.transaction(store).objectStore(store).get(key));
}

export async function idbPut<T>(store: StoreName, key: string, value: T): Promise<void> {
	const db = await openDb();
	await requestToPromise(db.transaction(store, 'readwrite').objectStore(store).put(value, key));
}

export async function idbDelete(store: StoreName, key: string): Promise<void> {
	const db = await openDb();
	await requestToPromise(db.transaction(store, 'readwrite').objectStore(store).delete(key));
}

export async function idbGetAll<T>(store: StoreName): Promise<T[]> {
	const db = await openDb();
	return requestToPromise(db.transaction(store).objectStore(store).getAll());
}
