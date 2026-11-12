// The library: your own memories, kept on this device and synced to Dropbox, shown
// alongside (or without) the invented examples that came with the prototype.
//
// On disk in Dropbox (DROPBOX_ROOT):
//   pins.json                 { format, places, trips, people, memories, marks }
//   photos/<year>/<id>.jpg    photo masters, 3,200 px on the long side
//
// Every record has an id and an updatedAt; deleting leaves a tombstone ({ id, deleted }).
// Two phones editing at once are merged record by record: the newer edit wins.

import * as sample from '../sample/data.js';
import * as idb from './idb.js';
import * as dbx from './dropbox.js';
import { DROPBOX_ROOT } from './config.js';

const COLLS = ['places', 'trips', 'people', 'memories', 'marks'];
const empty = () => ({ format: 'pins/1', places: [], trips: [], people: [], memories: [], marks: [] });

// The examples, flagged so they can never be mistaken for, or saved as, your own.
const SAMPLE = {
  places: sample.PLACES.map((x) => ({ ...x, sample: true })),
  trips: sample.TRIPS.map((x) => ({ ...x, sample: true })),
  collections: sample.COLLECTIONS.map((x) => ({ ...x, sample: true })),
  pins: sample.PINS.map((x) => ({ ...x, sample: true })),
};
// The core people (the two of you, family, friends) and the categories are part of the app.
const BASE_PEOPLE = sample.PEOPLE;
export const KINDS = sample.KINDS;
export const SAMPLE_COUNT = SAMPLE.pins.length;

let db = empty();
let meta = { rev: null, dirty: false, lastSync: 0, error: '' };
let showSamples = true;
const listeners = new Set();
export const onChange = (fn) => listeners.add(fn);
const emit = () => listeners.forEach((fn) => fn());

const SHOW_KEY = 'pins.showSamples';
const ME_KEY = 'pins.me';

export async function load() {
  try { showSamples = localStorage.getItem(SHOW_KEY) !== 'false'; } catch { /* private mode */ }
  try {
    db = { ...empty(), ...(await idb.get('kv', 'db')) };
    meta = { ...meta, ...(await idb.get('kv', 'meta')) };
  } catch (e) { console.warn('Pins: no local storage', e); }
  // Countries marked by hand used to live only in this browser; carry them over.
  try {
    const old = JSON.parse(localStorage.getItem('pins.countries.marked') || '[]');
    if (old.length) { for (const n of old) setMark(n, true, { quiet: true }); localStorage.removeItem('pins.countries.marked'); await persist(); }
  } catch { /* nothing to carry over */ }
}

async function persist() {
  await idb.set('kv', 'db', db);
  await idb.set('kv', 'meta', meta);
}

const live = (arr) => arr.filter((x) => !x.deleted);

// What the map shows.
export function view() {
  const own = {
    places: live(db.places), trips: live(db.trips), memories: live(db.memories),
  };
  const peopleById = new Map(BASE_PEOPLE.map((p) => [p.id, p]));
  for (const p of live(db.people)) peopleById.set(p.id, p);
  return {
    people: [...peopleById.values()],
    places: showSamples ? [...SAMPLE.places, ...own.places] : own.places,
    trips: showSamples ? [...SAMPLE.trips, ...own.trips] : own.trips,
    collections: showSamples ? SAMPLE.collections : [],
    pins: showSamples ? [...SAMPLE.pins, ...own.memories] : own.memories,
  };
}
export const own = () => ({ places: live(db.places), trips: live(db.trips), people: live(db.people), memories: live(db.memories) });
export const ownCount = () => live(db.memories).length;
export const getMemory = (id) => live(db.memories).find((m) => m.id === id);

export const samplesShown = () => showSamples;
export function setShowSamples(on) {
  showSamples = on;
  try { localStorage.setItem(SHOW_KEY, String(on)); } catch { /* private mode */ }
  emit();
}

export function me() { try { return localStorage.getItem(ME_KEY) || ''; } catch { return ''; } }
export function setMe(id) { try { localStorage.setItem(ME_KEY, id); } catch { /* private mode */ } emit(); }

// ---------- countries marked as visited by hand ----------

export const marks = () => live(db.marks).map((m) => m.id);
export function setMark(name, on, { quiet = false } = {}) {
  upsert('marks', on ? { id: name } : { id: name, deleted: true });
  if (!quiet) commit();
}

// ---------- writing ----------

export const newId = (prefix) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function upsert(coll, rec) {
  const i = db[coll].findIndex((x) => x.id === rec.id);
  const next = { ...rec, updatedAt: Date.now() };
  if (i >= 0) db[coll][i] = next; else db[coll].push(next);
}

async function commit() {
  meta.dirty = true;
  await persist();
  emit();
  sync();
}

// photos: [{ id, master: Blob, thumb: Blob }] new photos to store and upload.
export async function saveMemory(memory, { places = [], trips = [], people = [], photos = [] } = {}) {
  for (const ph of photos) {
    await idb.set('blobs', `thumb:${ph.id}`, ph.thumb);
    await idb.set('blobs', `full:${ph.id}`, ph.master);
    await idb.set('blobs', `upload:${ph.id}`, ph.master);
    urls.delete(`${ph.id}@thumb`); urls.delete(`${ph.id}@full`);
  }
  for (const p of places) upsert('places', p);
  for (const p of people) upsert('people', p);
  for (const t of trips) upsert('trips', t);
  upsert('memories', memory);
  fitTrips();
  await commit();
}

export async function deleteMemory(id) {
  upsert('memories', { id, deleted: true });
  fitTrips();
  await commit();
}

// A trip spans its memories: adding one on a later day stretches the trip.
function fitTrips() {
  const mems = live(db.memories);
  for (const t of live(db.trips)) {
    const dates = mems.filter((m) => m.trip === t.id).map((m) => m.date).sort();
    if (!dates.length) continue;
    if (dates[0] !== t.start || dates[dates.length - 1] !== t.end) upsert('trips', { ...t, start: dates[0], end: dates[dates.length - 1] });
  }
}

// ---------- sync ----------

const JSON_PATH = `${DROPBOX_ROOT}/pins.json`;
const photoPath = (id) => `${DROPBOX_ROOT}/photos/${id}.jpg`;

function merge(a, b) {
  const out = empty();
  for (const c of COLLS) {
    const byId = new Map();
    for (const x of [...(a[c] || []), ...(b[c] || [])]) {
      const y = byId.get(x.id);
      if (!y || (x.updatedAt || 0) > (y.updatedAt || 0)) byId.set(x.id, x);
    }
    out[c] = [...byId.values()].sort((x, y) => (x.id < y.id ? -1 : 1));
  }
  return out;
}
const same = (a, b) => COLLS.every((c) => JSON.stringify(a[c] || []) === JSON.stringify(b[c] || []));

export const status = () => ({
  configured: dbx.configured(), connected: dbx.connected(), account: dbx.account(),
  dirty: meta.dirty, lastSync: meta.lastSync, error: meta.error, syncing: !!syncing,
});
export async function pendingPhotos() { return (await idb.keys('blobs')).filter((k) => String(k).startsWith('upload:')).length; }

let syncing = null;
export function sync() {
  if (!dbx.connected() || !navigator.onLine) return Promise.resolve();
  syncing ||= (async () => {
    emit();
    try {
      // Photos first, so a memory never reaches the other phone before its pictures.
      for (const k of await idb.keys('blobs')) {
        if (!String(k).startsWith('upload:')) continue;
        const id = String(k).slice(7);
        await dbx.upload(photoPath(id), await idb.get('blobs', k), { overwrite: true });
        await idb.del('blobs', k);
      }
      for (let attempt = 0; attempt < 4; attempt++) {
        const remote = await dbx.download(JSON_PATH);
        const theirs = remote ? JSON.parse(await remote.blob.text()) : empty();
        const merged = merge(db, theirs);
        const changedHere = !same(merged, db);
        let rev = remote?.meta.rev || null;
        if (!remote || !same(merged, theirs)) {
          try {
            const body = new Blob([JSON.stringify({ ...merged, savedAt: new Date().toISOString() }, null, 1)], { type: 'application/json' });
            rev = (await dbx.upload(JSON_PATH, body, { rev })).rev;
          } catch (e) {
            if (e.conflict) continue; // someone else saved in between: merge again
            throw e;
          }
        }
        db = merged;
        meta = { ...meta, rev, dirty: false, lastSync: Date.now(), error: '' };
        await persist();
        if (changedHere) emit();
        break;
      }
    } catch (e) {
      meta.error = e.message || String(e);
      await persist();
      console.warn('Pins sync:', e);
    } finally {
      syncing = null;
      emit();
    }
  })();
  return syncing;
}

// ---------- photos ----------
// A photo reference is a sample name ("mplus") or "pins:<year>/<id>" for your own.

const urls = new Map();
const loading = new Map();
export const isOwnPhoto = (ref) => String(ref).startsWith('pins:');

// Synchronous when it can be: sample photos and photos already loaded.
export function photoSrc(ref, size = 'thumb') {
  if (!ref) return '';
  if (!isOwnPhoto(ref)) return `sample/img/${ref}.jpg`;
  return urls.get(`${ref.slice(5)}@${size}`) || '';
}

// Loads one of your photos: from this device if it's here, else from Dropbox (then kept).
export function loadPhoto(ref, size = 'thumb') {
  const id = ref.slice(5);
  const key = `${id}@${size}`;
  if (urls.has(key)) return Promise.resolve(urls.get(key));
  if (!loading.has(key)) {
    loading.set(key, (async () => {
      let blob = await idb.get('blobs', `${size}:${id}`);
      if (!blob && size === 'thumb') blob = await idb.get('blobs', `full:${id}`);
      if (!blob && dbx.connected()) {
        blob = await dbx.thumbnail(photoPath(id), size === 'thumb' ? 'w640h480' : 'w2048h1536');
        await idb.set('blobs', `${size}:${id}`, blob);
      }
      if (!blob) throw new Error('photo not available offline');
      const u = URL.createObjectURL(blob);
      urls.set(key, u);
      return u;
    })().finally(() => loading.delete(key)));
  }
  return loading.get(key);
}

// ---------- start-up ----------

export async function start() {
  await load();
  try { if (await dbx.finishRedirect()) meta.error = ''; } catch (e) { meta.error = e.message; }
  window.addEventListener('online', () => sync());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sync(); });
  setInterval(() => sync(), 5 * 60 * 1000);
  sync();
}

export const dropbox = dbx;
