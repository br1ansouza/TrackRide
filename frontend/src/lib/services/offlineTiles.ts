import maplibregl from 'maplibre-gl';
import type { StyleSpecification, VectorSourceSpecification } from 'maplibre-gl';
import type { LatLng } from './routing';
import { idbGet, idbPut } from '$lib/utils/idb';
import { corridorTiles } from '$lib/utils/tileMath';
import { haversineM } from '$lib/utils/mapHelpers';

const STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const PROTOCOL = 'offline';
const PREFETCH_ZOOMS = [7, 8, 9, 10, 11, 12, 13, 14];
const DECIMATE_STEP_M = 1000;
const CONCURRENCY = 6;
const STYLE_CACHE_KEY = 'map-style';
const TEMPLATE_CACHE_KEY = 'map-tile-template';

let protocolRegistered = false;

function decodeJson(buffer: ArrayBuffer): unknown {
	return JSON.parse(new TextDecoder().decode(buffer));
}

export function registerOfflineProtocol(): void {
	if (protocolRegistered) return;
	protocolRegistered = true;
	maplibregl.addProtocol(PROTOCOL, async (params) => {
		const url = params.url.replace(`${PROTOCOL}://`, '');
		const cached = await idbGet<ArrayBuffer>('tiles', url).catch(() => undefined);
		if (cached !== undefined) {
			return { data: params.type === 'json' ? decodeJson(cached) : cached };
		}
		const response = await fetch(url);
		if (response.status === 204) return { data: null };
		if (!response.ok) throw new Error(`Tile ${response.status}: ${url}`);
		const buffer = await response.arrayBuffer();
		idbPut('tiles', url, buffer).catch((error) => console.error('Falha ao cachear tile:', error));
		return { data: params.type === 'json' ? decodeJson(buffer) : buffer };
	});
}

export async function prepareMapStyle(): Promise<StyleSpecification | string> {
	try {
		const styleResponse = await fetch(STYLE_URL);
		if (!styleResponse.ok) throw new Error(`Style ${styleResponse.status}`);
		const style: StyleSpecification = await styleResponse.json();

		for (const source of Object.values(style.sources)) {
			if (source.type !== 'vector' || !source.url) continue;
			const tileJsonResponse = await fetch(source.url);
			if (!tileJsonResponse.ok) throw new Error(`TileJSON ${tileJsonResponse.status}`);
			const tileJson: { tiles: string[]; minzoom?: number; maxzoom?: number } = await tileJsonResponse.json();
			const template = tileJson.tiles[0];
			const vectorSource = source as VectorSourceSpecification;
			delete vectorSource.url;
			vectorSource.tiles = [`${PROTOCOL}://${template}`];
			vectorSource.minzoom = tileJson.minzoom ?? 0;
			vectorSource.maxzoom = tileJson.maxzoom ?? 14;
			idbPut('cache', TEMPLATE_CACHE_KEY, template).catch((error) => console.error('Falha ao cachear template:', error));
		}
		if (style.glyphs) style.glyphs = `${PROTOCOL}://${style.glyphs}`;
		if (style.sprite && typeof style.sprite === 'string') style.sprite = `${PROTOCOL}://${style.sprite}`;

		idbPut('cache', STYLE_CACHE_KEY, style).catch((error) => console.error('Falha ao cachear style:', error));
		return style;
	} catch {
		const cached = await idbGet<StyleSpecification>('cache', STYLE_CACHE_KEY).catch(() => undefined);
		return cached ?? STYLE_URL;
	}
}

function decimate(coords: LatLng[], stepM: number): LatLng[] {
	if (coords.length === 0) return [];
	const result: LatLng[] = [coords[0]];
	let last = coords[0];
	for (const point of coords) {
		if (haversineM(last, point) >= stepM) {
			result.push(point);
			last = point;
		}
	}
	return result;
}

export interface PrefetchResult {
	downloaded: number;
	failed: number;
	total: number;
}

export async function prefetchRouteTiles(
	coords: LatLng[],
	onProgress: (done: number, total: number) => void
): Promise<PrefetchResult> {
	const cachedTemplate = await idbGet<string>('cache', TEMPLATE_CACHE_KEY);
	if (!cachedTemplate) throw new Error('Template de tiles indisponível');
	const template: string = cachedTemplate;

	const tiles = corridorTiles(decimate(coords, DECIMATE_STEP_M), PREFETCH_ZOOMS);
	const queue = [...tiles];
	let done = 0;
	let downloaded = 0;
	let failed = 0;

	async function worker(): Promise<void> {
		let tile = queue.shift();
		while (tile) {
			const url = template
				.replace('{z}', String(tile.z))
				.replace('{x}', String(tile.x))
				.replace('{y}', String(tile.y));
			const existing = await idbGet<ArrayBuffer>('tiles', url).catch(() => undefined);
			if (existing === undefined) {
				try {
					const response = await fetch(url);
					if (response.ok) {
						await idbPut('tiles', url, await response.arrayBuffer());
						downloaded++;
					} else if (response.status !== 204) {
						failed++;
					}
				} catch {
					failed++;
				}
			}
			done++;
			onProgress(done, tiles.length);
			tile = queue.shift();
		}
	}

	await Promise.all(Array.from({ length: CONCURRENCY }, worker));
	return { downloaded, failed, total: tiles.length };
}
