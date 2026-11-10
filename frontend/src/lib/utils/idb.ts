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
	await committedWrite(db, store, objectStore => objectStore.put(value, key));
}

export async function idbDelete(store: StoreName, key: string): Promise<void> {
	const db = await openDb();
	await committedWrite(db, store, objectStore => objectStore.delete(key));
}

export async function idbGetAll<T>(store: StoreName): Promise<T[]> {
	const db = await openDb();
	return requestToPromise(db.transaction(store).objectStore(store).getAll());
}

export async function idbClear(store: StoreName): Promise<void> {
	const db = await openDb();
	await committedWrite(db, store, objectStore => objectStore.clear());
}

function committedWrite(db: IDBDatabase, store: StoreName, write: (store: IDBObjectStore) => void): Promise<void> {
 return new Promise((resolve, reject) => {
  const transaction = db.transaction(store, 'readwrite');
  transaction.oncomplete = () => resolve();
  transaction.onabort = () => reject(transaction.error ?? new Error('Não foi possível salvar no aparelho.'));
  transaction.onerror = () => reject(transaction.error);
  write(transaction.objectStore(store));
 });
}
