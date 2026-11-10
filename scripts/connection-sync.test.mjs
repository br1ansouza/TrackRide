import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from '../frontend/node_modules/typescript/lib/typescript.js';

const root = path.resolve(import.meta.dirname, '../frontend/src/lib');
function harness(fetch = async () => new Response('{}'), mocks = {}) {
 const storage = new Map([
  ['trackride:token', 'token-a'],
  ['trackride:user', JSON.stringify({ id: 7, name: 'Rider' })]
 ]);
 const entries = new Map();
 let clock = 0;
 let slow;
 const mounts = [];
 const modules = new Map();
 const idb = {
  idbPut: async (_, id, value) => { entries.set(id, structuredClone(value)); },
  idbGet: async (_, id) => entries.get(id),
  idbGetAll: async () => [...entries.values()],
  idbDelete: async (_, id) => { entries.delete(id); },
  idbClear: async () => {}
 };
 const scope = { console, Response, Headers, AbortSignal, Error, TypeError, crypto,
  navigator: { onLine: true }, Date: { now: () => clock },
  setTimeout: (fn, ms) => { if (ms === 2500) slow = fn; else { clock += ms; queueMicrotask(fn); } return 1; },
  clearTimeout() {}, $state: value => value,
  localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, val) => storage.set(key,val), removeItem: key => storage.delete(key) },
  fetch: (...args) => fetch(...args)
 };
 function load(name) {
  if (mocks[name]) return mocks[name];
  name = name.replace(/^#lib\//, "$lib/").replace(/\.js$/, "");
  if (name === '$lib/utils/platform') return { configuredApiUrl: 'https://api.test' };
  if (name === '$lib/utils/idb') return idb;
  if (name === 'svelte') return { onMount: fn => mounts.push(fn) };
  if (name === '$app/navigation') return { goto() {} };
  const base = name.replace(/^\$lib\//, '');
  const filename = path.resolve(root, base.endsWith('.ts') ? base : base + '.ts');
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} }; modules.set(filename, module);
  const code = ts.transpile(fs.readFileSync(filename, 'utf8'), { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 });
  const require = spec => spec.startsWith('.') ? load(path.resolve(path.dirname(filename), spec)) : load(spec);
  vm.runInNewContext(code, { ...scope, module, exports: module.exports, require }, { filename });
  return module.exports;
 }
 return { load, entries, storage, scope, mounts, idb, slow: () => slow?.() };
}
const route = { origin_name: 'A', destination_name: 'B', name: 'A → B', completed: true };

test('cold start shares one readiness probe, announces waking and recovers', async () => {
 let resolve;
 let probes = 0;
 const h = harness(() => { probes++; return new Promise(r => resolve = r); });
 const api = h.load('services/api'); const state = h.load('stores/apiStatus.svelte').apiStatus;
 const first = api.wakeUpApi(); const second = api.wakeUpApi();
 assert.equal(first, second); h.slow(); assert.equal(state.state, 'waking');
 resolve(new Response('ok')); assert.equal(await first, true);
 assert.equal(probes, 1); assert.equal(state.state, 'ready');
});

test('failing server has a bounded retry window and is not labeled offline', async () => {
 let calls = 0; const h = harness(async () => { calls++; return new Response('', { status: 503 }); });
 assert.equal(await h.load('services/api').wakeUpApi(), false);
 assert.equal(h.load('stores/apiStatus.svelte').apiStatus.state, 'unavailable');
 assert.ok(calls <= 31);
});

test('a failed POST is not automatically replayed; error stays retryable', async () => {
 let posts = 0;
 const h = harness(async url => { if (url.endsWith('/up')) return new Response('ok'); posts++; throw new TypeError('network'); });
 const api = h.load('services/api');
 await assert.rejects(api.request('/routes', { method: 'POST' }), error => api.isTemporaryError(error));
 assert.equal(posts, 1);
});

test('offline completion persists locally without contacting API and failed sync keeps it', async () => {
 const h = harness(async () => { throw new TypeError('network'); });
 const queue = h.load('services/syncQueue'); h.scope.navigator.onLine = false;
 await queue.enqueueRide(route, 10); assert.equal(h.entries.size, 1);
 assert.equal(await queue.flushRides(), 0); assert.equal(h.entries.size, 1);
 h.scope.navigator.onLine = true;
 assert.equal(await queue.flushRides(), 0); assert.equal(h.entries.size, 1);
});

test('concurrent flushes share work and retry the same ID after a lost acknowledgement', async () => {
 let attempts = 0; const ids = [];
 const h = harness(async (url, init) => {
  if (url.endsWith('/up')) return new Response('ok');
  const body = JSON.parse(init.body); ids.push(body.client_id); attempts++;
  if (attempts === 1) throw new TypeError('response lost');
  return Response.json({ route: { id: 42, client_id: body.client_id } });
 });
 const queue = h.load('services/syncQueue'); const id = await queue.enqueueRide(route, 10);
 const a = queue.flushRides(); const b = queue.flushRides(); assert.equal(a, b);
 assert.equal(await a, 0); assert.equal(h.entries.size, 1);
 assert.equal(await queue.flushRides(), 1); assert.equal(h.entries.size, 0);
 assert.deepEqual(ids, [id, id]);
});

test('validation failures and malformed success acknowledgements never delete trips', async () => {
 for (const response of [() => Response.json({ error: 'invalid' }, { status: 422 }), () => Response.json({ route: { id: 1 } })]) {
  const h = harness(async url => url.endsWith('/up') ? new Response('ok') : response());
  const queue = h.load('services/syncQueue'); await queue.enqueueRide(route, null);
  assert.equal(await queue.flushRides(), 0); assert.equal(h.entries.size, 1);
 }
});

test('another account cannot upload a pending ride', async () => {
 let posts = 0; const h = harness(async () => { posts++; return new Response('ok'); });
 const queue = h.load('services/syncQueue'); await queue.enqueueRide(route, null);
 h.storage.set('trackride:user', JSON.stringify({ id: 8 })); h.storage.set('trackride:token', 'token-b');
 assert.equal(await queue.flushRides(), 0); assert.equal(posts, 0); assert.equal(h.entries.size, 1);
});

test('failed local write is reported instead of claiming the ride is saved', async () => {
 const h = harness(); h.idb.idbPut = async () => { throw new Error('quota exceeded'); };
 await assert.rejects(h.load('services/syncQueue').enqueueRide(route, null), /quota/);
 assert.equal(h.entries.size, 0);
});

test('multiple authentication consumers share one request and cached user renders immediately', async () => {
 let calls = 0; let resolve;
 const h = harness(async url => { if (url.endsWith('/up')) return new Response('ok'); calls++; return new Promise(r => resolve = r); });
 const auth = h.load('stores/auth.svelte'); const first = auth.useAuth(); auth.useAuth();
 h.mounts.forEach(fn => fn());
 assert.equal(first.loading, false); assert.equal(first.user.id, 7);
 await new Promise(r => setImmediate(r)); assert.equal(calls, 1);
 resolve(Response.json({ user: { id: 7, name: 'Fresh' } }));
 await new Promise(r => setImmediate(r)); assert.equal(first.user.name, 'Fresh');
});

test('one validation failure does not block the other pending rides', async () => {
 const h = harness(async (url, init) => {
  if (url.endsWith('/up')) return new Response('ok');
  const data = JSON.parse(init.body);
  return data.name === 'invalid' ? Response.json({error:'invalid'}, {status:422}) : Response.json({route:{id:42,client_id:data.client_id}});
 });
 const queue = h.load('services/syncQueue');
 await queue.enqueueRide({...route,name:'invalid'},null);
 await queue.enqueueRide(route,null);
 assert.equal(await queue.flushRides(),1); assert.equal(h.entries.size,1);
 assert.equal([...h.entries.values()][0].routeParams.name,'invalid');
});

test('legacy pending rides are assigned to the previous account before signing into another', async () => {
 const h = harness(async url => url.endsWith('/up') ? new Response('ok') : Response.json({token:'token-b',user:{id:8}}));
 h.entries.set('legacy',{id:'legacy',routeParams:route});
 await h.load('services/auth').login('b@example.test','password');
 assert.equal(h.entries.get('legacy').userId,7);
 assert.equal(h.storage.get('trackride:token'),'token-b');
 assert.equal(await h.load('services/syncQueue').flushRides(),0);
});

test('a delayed 401 from the old account cannot clear a newer session', async () => {
 let resolve;
 const h = harness(async url => url.endsWith('/up') ? new Response('ok') : new Promise(r=>resolve=r));
 const api = h.load('services/api');const pending = api.request('/auth/me');
 await new Promise(r=>setImmediate(r));
 h.storage.set('trackride:token','token-b');
 resolve(Response.json({error:'expired'},{status:401}));
 await assert.rejects(pending);
 assert.equal(h.storage.get('trackride:token'),'token-b');
});

test('web GPS uses the browser despite Capacitor being present, and stopping tracking preserves the map watcher', async () => {
 const h = harness(undefined, {'@capacitor/core': {Capacitor:{isNativePlatform:()=>false}}});
 const callbacks = new Map();let id=0;
 h.scope.window={Capacitor:{}};
 h.scope.navigator.geolocation={watchPosition:cb=>{callbacks.set(++id,cb);return id}, clearWatch:id=>callbacks.delete(id)};
 const geo=h.load('services/geolocation');
 const opts={onPosition(){},onError(){}};
 await geo.watchPosition(opts);await geo.startBackgroundWatch(opts);
 assert.equal(callbacks.size,2);
 await geo.stopBackgroundWatch();assert.equal(callbacks.size,1);
 await geo.clearWatch();assert.equal(callbacks.size,0);
});

test('stopping while native GPS starts removes the late watcher', async () => {
 let resolveWatcher;const removed=[];
 const plugin={addWatcher:()=>new Promise(r=>resolveWatcher=r),removeWatcher:async ({id})=>removed.push(id)};
 const h=harness(undefined,{'@capacitor/core':{Capacitor:{isNativePlatform:()=>true},registerPlugin:()=>plugin},'@capacitor/local-notifications':{LocalNotifications:{checkPermissions:async()=>({display:'granted'})}}});
 h.scope.window={};
 const geo=h.load('services/geolocation');
 const starting=geo.startBackgroundWatch({onPosition(){},onError(){}});
 await new Promise(r=>setImmediate(r));await geo.stopBackgroundWatch();
 resolveWatcher('late-watcher');await starting;
 assert.deepEqual(removed,['late-watcher']);
});
