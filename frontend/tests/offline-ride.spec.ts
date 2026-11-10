import { test, expect, type Page } from '@playwright/test';

const user = { id: 7, name: 'Teste', email: 'test@example.test', riding_preference: 'mixed' };
const cors = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': '*',
	'Access-Control-Allow-Methods': '*'
};

test('explains cold start and recovers after the connection returns', async ({ page, context }) => {
	let ready = false;
	await page.route('**/up', async (route) => {
		if (!ready) await new Promise((resolve) => setTimeout(resolve, 3000));
		await route.fulfill({ status: ready ? 200 : 503, body: 'ok', headers: cors });
	});
	await page.goto('/login');
	await expect(page.getByText('Ligando o servidor…', { exact: true })).toBeVisible();
	ready = true;
	await expect(page.getByText('Ligando o servidor…', { exact: true })).toBeHidden();
	await context.setOffline(true);
	await expect(page.getByText('Sem conexão com a internet', { exact: true })).toBeVisible();
	await context.setOffline(false);
	await expect(page.getByText('Sem conexão com a internet', { exact: true })).toBeHidden();
});

async function prepareRide(page: Page) {
	const errors: string[] = [];
	const ids: string[] = [];
	const payloads: Record<string, unknown>[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.route('**/up', (route) => route.fulfill({ body: 'ok', headers: cors }));
	await page.route('**/api/v1/**', async (route) => {
		if (route.request().method() === 'OPTIONS')
			return route.fulfill({ status: 204, headers: cors });
		if (route.request().url().endsWith('/auth/me'))
			return route.fulfill({ json: { user }, headers: cors });
		if (route.request().method() === 'POST') {
			const body = route.request().postDataJSON();
			ids.push(body.client_id);
			payloads.push(body);
			if (ids.length === 1) return route.abort('failed');
			return route.fulfill({
				json: { route: { id: 42, client_id: body.client_id } },
				headers: cors
			});
		}
		return route.fulfill({ json: { routes: [], total: 0 }, headers: cors });
	});
	await page.route('https://basemaps.cartocdn.com/**', (route) =>
		route.fulfill({
			json: {
				version: 8,
				sources: {},
				layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#17212b' } }]
			},
			headers: cors
		})
	);
	await page.goto('/login');
	await page.evaluate(async (user) => {
		localStorage.setItem('trackride:token', 'test-token');
		localStorage.setItem('trackride:user', JSON.stringify(user));
		localStorage.setItem(
			'trackride:last-position',
			JSON.stringify({ coords: [-27.5, -48.5], savedAt: Date.now() })
		);
		await new Promise<void>((resolve, reject) => {
			const request = indexedDB.open('trackride', 2);
			request.onupgradeneeded = () => {
				for (const store of ['route-packs', 'sync-queue', 'tiles', 'cache'])
					if (!request.result.objectStoreNames.contains(store))
						request.result.createObjectStore(store);
			};
			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const db = request.result;
				const tx = db.transaction('route-packs', 'readwrite');
				tx.objectStore('route-packs').put(
					{
						originLabel: 'Origem',
						destLabel: 'Destino',
						originCoords: [-27.5, -48.5],
						destCoords: [-27.49, -48.5],
						stops: [],
						routeData: {
							coords: [
								[-27.5, -48.5],
								[-27.49, -48.5]
							],
							totalDistance: 1110,
							totalDuration: 120,
							segmentDistances: [1110],
							segmentDurations: [120]
						},
						weatherPoints: [],
						editingRouteId: null,
						exploreRouteId: null,
						savedAt: Date.now()
					},
					'current'
				);
				tx.oncomplete = () => {
					db.close();
					resolve();
				};
				tx.onerror = () => reject(tx.error);
			};
		});
	}, user);
	await page.addInitScript(() => {
		const state = window as typeof window & {
			testOffline: boolean;
			gpsCallbacks: Map<number, PositionCallback>;
			sendGps: (lat: number) => void;
		};
		state.testOffline = true;
		Object.defineProperty(navigator, 'onLine', {
			get: () => !state.testOffline,
			configurable: true
		});
		state.gpsCallbacks = new Map();
		let id = 0;
		navigator.geolocation.watchPosition = (callback) => {
			state.gpsCallbacks.set(++id, callback);
			return id;
		};
		navigator.geolocation.clearWatch = (id) => {
			state.gpsCallbacks.delete(id);
		};
		state.sendGps = (latitude) => {
			const fix = {
				timestamp: Date.now(),
				coords: { latitude, longitude: -48.5, accuracy: 5, speed: 10, heading: 0 }
			} as GeolocationPosition;
			for (const callback of state.gpsCallbacks.values()) callback(fix);
		};
	});
	await page.goto('/');
	await page.getByRole('button', { name: 'Começar rota', exact: true }).click();
	await page.waitForFunction(() => (window as any).gpsCallbacks.size === 2);
	await page.evaluate(() => {
		for (const lat of [-27.5, -27.495, -27.49]) (window as any).sendGps(lat);
	});
	return { errors, ids, payloads };
}

async function restoreNetwork(page: Page) {
	await page.evaluate(() => {
		(window as any).testOffline = false;
		window.dispatchEvent(new Event('online'));
	});
}

test('offline summary survives a lost response and confirms a retry with the same UUID', async ({
	page
}) => {
	const { errors, ids, payloads } = await prepareRide(page);
	await page.getByRole('button', { name: 'Encerrar rota', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Viagem encerrada' })).toBeVisible();
	await expect(
		page.getByText('Salvo no aparelho · aguardando sincronização.', { exact: false })
	).toBeVisible();
	expect(ids).toHaveLength(0);
	await restoreNetwork(page);
	await expect.poll(() => ids.length).toBe(1);
	await page.evaluate(() => window.dispatchEvent(new Event('focus')));
	await expect(
		page.getByText('Salvo e sincronizado com sua conta.', { exact: true })
	).toBeVisible();
	expect(ids).toHaveLength(2);
	expect(ids[0]).toBe(ids[1]);
	expect(payloads[0].score).toBeUndefined();
	expect(errors).toEqual([]);
});

test('a local trip remains queued after reloading and syncs when the network returns', async ({
	page
}) => {
	const { errors, ids } = await prepareRide(page);
	await page.getByRole('button', { name: 'Encerrar rota', exact: true }).click();
	await expect(
		page.getByText('Salvo no aparelho · aguardando sincronização.', { exact: false })
	).toBeVisible();
	await page.getByRole('button', { name: 'Fechar resumo' }).click();
	await page.reload();
	await expect(page.getByText('1 viagem(ns) salva(s) no aparelho', { exact: false })).toBeVisible();
	await restoreNetwork(page);
	await expect.poll(() => ids.length).toBe(1);
	const retry = page.getByRole('button', { name: 'Tentar sincronizar' });
	await expect(retry).toBeEnabled();
	await retry.click();
	await expect(retry).toBeHidden();
	expect(ids).toHaveLength(2);
	expect(ids[0]).toBe(ids[1]);
	expect(errors).toEqual([]);
});

test('an IndexedDB transaction abort keeps the summary open and can be retried', async ({
	page
}) => {
	const { errors } = await prepareRide(page);
	await page.evaluate(() => {
		const original = IDBObjectStore.prototype.put;
		IDBObjectStore.prototype.put = function (...args) {
			const request = original.apply(this, args);
			if (this.name === 'sync-queue') {
				IDBObjectStore.prototype.put = original;
				this.transaction.abort();
			}
			return request;
		};
	});
	await page.getByRole('button', { name: 'Encerrar rota', exact: true }).click();
	await expect(
		page.getByText('Não foi possível salvar no aparelho.', { exact: false })
	).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('heading', { name: 'Viagem encerrada' })).toBeVisible();
	await page.getByRole('button', { name: 'Tentar salvar novamente' }).click();
	await expect(
		page.getByText('Salvo no aparelho · aguardando sincronização.', { exact: false })
	).toBeVisible();
	expect(errors).toEqual([]);
});
