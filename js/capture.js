// Quick capture: a new memory (or an edit of one of your own). Photos come first, because
// they bring their own date and place; everything else is a few taps.

import * as lib from './library.js';
import { prepare } from './photos.js';
import * as geo from './geocode.js';
import { km } from './geo.js';

const L = window.L;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pressed = (on) => `aria-pressed="${on ? 'true' : 'false'}"`;
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const addDays = (d, n) => new Date(Date.parse(d) + n * 864e5).toISOString().slice(0, 10);
const initials = (name) => name.split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase()).join('').slice(0, 2) || '?';

let st = null; // the form's state while open
let mini = null; // the little map under "Where"
let movingByCode = false;
let lookupTimer = null;
let hooks = {};

export function initCapture({ onSaved, onDeleted, toast }) {
  hooks = { onSaved, onDeleted, toast };
  const form = $('cap-form');
  form.addEventListener('submit', (e) => { e.preventDefault(); save(); });
  $('cap-photos').addEventListener('click', onPhotoClick);
  $('cap-date').addEventListener('change', () => { st.date = $('cap-date').value; st.dateSet = true; guessTrip(); renderTrips(); });
  $('cap-find').addEventListener('click', find);
  $('cap-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); find(); } });
  $('cap-results').addEventListener('click', (e) => {
    const b = e.target.closest('[data-r]');
    if (!b) return;
    const r = st.results[+b.dataset.r];
    $('cap-results').hidden = true;
    $('cap-q').value = '';
    setPlaceFields(r);
    setLocation(r.lat, r.lon, { lookup: false });
  });
  $('cap-here').addEventListener('click', here);
  $('cap-place').addEventListener('input', () => { st.place.name = $('cap-place').value; st.place.nameSet = true; st.place.existing = null; renderWhere(); });
  $('cap-city').addEventListener('input', () => { st.place.city = $('cap-city').value; st.place.existing = null; });
  $('cap-country').addEventListener('input', () => { st.place.country = $('cap-country').value; st.place.existing = null; });
  $('cap-where').addEventListener('click', (e) => {
    const b = e.target.closest('[data-use]');
    if (!b) return;
    const pl = lib.own().places.find((p) => p.id === b.dataset.use);
    if (pl) { usePlace(pl); setLocation(pl.lat, pl.lon, { lookup: false, keepPlace: true }); }
  });
  $('cap-kind').addEventListener('click', (e) => { const b = e.target.closest('[data-kind]'); if (b) { st.kind = b.dataset.kind; renderChips(); } });
  $('cap-with').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.addPerson !== undefined) {
      const name = prompt('Who else was there?');
      if (!name?.trim()) return;
      const p = { id: lib.newId('pe-'), name: name.trim(), initial: initials(name.trim()) };
      st.newPeople.push(p);
      st.with.add(p.id);
    } else if (b.dataset.with) {
      if (st.with.has(b.dataset.with)) st.with.delete(b.dataset.with); else st.with.add(b.dataset.with);
    }
    renderChips();
  });
  $('cap-by').addEventListener('click', (e) => { const b = e.target.closest('[data-by]'); if (b) { st.by = b.dataset.by; renderChips(); } });
  $('cap-trip').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.newTrip !== undefined) {
      const title = prompt('Name the trip', '');
      if (!title?.trim()) return;
      st.newTrip = { id: lib.newId('tr-'), title: title.trim(), start: st.date, end: st.date, with: [...st.with] };
      st.trip = st.newTrip.id;
    } else st.trip = b.dataset.trip;
    st.tripSet = true;
    renderTrips();
  });
  $('cap-delete').addEventListener('click', async () => {
    if (!st?.id || !confirm('Delete this memory? Its photos stay in Dropbox.')) return;
    await lib.deleteMemory(st.id);
    close();
    hooks.toast('Memory deleted.');
    hooks.onDeleted?.();
  });
}

// ---------- open / close ----------

export function open(memoryId) {
  const m = memoryId ? lib.getMemory(memoryId) : null;
  const ownPlaces = lib.own().places;
  const pl = m ? ownPlaces.find((p) => p.id === m.place) : null;
  const me = lib.me();
  st = {
    id: m?.id || null,
    photos: m ? photoRefs(m).map((ref) => ({ ref })) : [],
    title: m?.title || '',
    text: m ? textOf(m) : '',
    date: m?.date || today(), dateSet: !!m,
    kind: m?.kind || 'moment',
    with: new Set(m?.with || [me || 'stefan']),
    by: m?.by || me || 'stefan',
    trip: m?.trip || '', tripSet: !!m, newTrip: null,
    newPeople: [],
    loc: pl ? { lat: pl.lat, lon: pl.lon } : null,
    place: pl ? { name: pl.name, city: pl.city, country: pl.country, existing: pl.id, nameSet: true } : { name: '', city: '', country: '', existing: null, nameSet: false },
    results: [], busy: 0, created: m?.createdAt, keep: { tags: m?.tags || [], collections: m?.collections },
  };
  $('cap-heading').textContent = m ? 'Edit memory' : 'New memory';
  $('cap-title').value = st.title;
  $('cap-text').value = st.text;
  $('cap-date').value = st.date;
  $('cap-q').value = '';
  $('cap-results').hidden = true;
  $('cap-delete').hidden = !m;
  setPlaceFields(st.place);
  if (!m) guessTrip();
  renderPhotos(); renderChips(); renderTrips(); renderWhere();
  $('capture').hidden = false;
  $('capture').querySelector('.sheet-body').scrollTop = 0;
  requestAnimationFrame(() => {
    ensureMap();
    mini.invalidateSize();
    movingByCode = true;
    if (st.loc) mini.setView([st.loc.lat, st.loc.lon], 15, { animate: false });
    else mini.setView([30, 10], 1.5, { animate: false });
    movingByCode = false;
  });
}

export function close() { $('capture').hidden = true; st = null; }
export const isOpen = () => !!st;

// ---------- photos ----------

function photoRefs(m) {
  const refs = [m.photo, ...(m.body || []).flatMap((b) => (b.img ? [b.img] : b.imgs || []))].filter(Boolean);
  return [...new Set(refs)];
}

async function addFiles(files) {
  for (const file of files) {
    const item = { id: null, pending: true, url: '' };
    st.photos.push(item);
    st.busy++;
    renderPhotos();
    try {
      const p = await prepare(file);
      const year = (p.date || st.date).slice(0, 4);
      Object.assign(item, { id: `${year}/${lib.newId('ph-')}`, master: p.master, thumb: p.thumb, url: URL.createObjectURL(p.thumb), pending: false });
      item.ref = `pins:${item.id}`;
      // The first photo with a date and place sets them, unless they were set by hand.
      if (p.date && !st.dateSet) { st.date = p.date; st.dateSet = true; $('cap-date').value = p.date; guessTrip(); renderTrips(); }
      if (p.lat != null && !st.loc) setLocation(p.lat, p.lon);
      if (p.lat == null && !st.loc && !st.noGpsWarned) { st.noGpsWarned = true; hooks.toast('This photo has no location: find the place below.'); }
    } catch (e) {
      st.photos.splice(st.photos.indexOf(item), 1);
      hooks.toast(`Couldn’t read that photo (${e.message}).`);
    } finally {
      st.busy--;
      renderPhotos();
    }
  }
}

function onPhotoClick(e) {
  const rm = e.target.closest('[data-rm]');
  const cover = e.target.closest('[data-cover]');
  if (rm) { st.photos.splice(+rm.dataset.rm, 1); renderPhotos(); }
  else if (cover && +cover.dataset.cover > 0) {
    const [ph] = st.photos.splice(+cover.dataset.cover, 1);
    st.photos.unshift(ph);
    renderPhotos();
    hooks.toast('That one is the cover now.');
  }
}

function renderPhotos() {
  const tiles = st.photos.map((ph, i) => {
    const src = ph.url || (ph.ref ? lib.photoSrc(ph.ref, 'thumb') : '');
    const img = ph.pending ? '<span class="cap-spin"></span>'
      : src ? `<img src="${src}" alt="">` : `<img data-ph="${esc(ph.ref)}" data-size="thumb" alt="">`;
    return `<div class="cap-ph${i === 0 ? ' cover' : ''}"><button type="button" class="cap-ph-img" data-cover="${i}" aria-label="${i ? 'Make this the cover' : 'Cover photo'}">${img}</button>${i === 0 && st.photos.length > 1 ? '<span class="cap-cover">Cover</span>' : ''}<button type="button" class="cap-rm" data-rm="${i}" aria-label="Remove photo">×</button></div>`;
  }).join('');
  $('cap-photos').innerHTML = `${tiles}<label class="cap-add-ph"><input type="file" id="cap-file" accept="image/*" multiple hidden><svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg><span>${st.photos.length ? 'More' : 'Photos'}</span></label>`;
  $('cap-file').addEventListener('change', (e) => { addFiles([...e.target.files]); e.target.value = ''; });
  $('cap-save').disabled = st.busy > 0;
}

// ---------- where ----------

function ensureMap() {
  if (mini) return;
  mini = L.map('cap-map', { zoomControl: false, attributionControl: false, zoomSnap: 0.5, minZoom: 1, maxZoom: 18 });
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', { maxNativeZoom: 16, maxZoom: 18 }).addTo(mini);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', { maxNativeZoom: 16, maxZoom: 18 }).addTo(mini);
  mini.on('moveend', () => {
    if (movingByCode || !st) return;
    const c = mini.getCenter();
    if (mini.getZoom() < 10 && !st.loc) return; // still looking around the world
    setLocation(c.lat, c.lng, { fly: false });
  });
}

function setLocation(lat, lon, { lookup = true, fly = true, keepPlace = false } = {}) {
  st.loc = { lat: +lat.toFixed(6), lon: +lon.toFixed(6) };
  if (fly && mini) {
    movingByCode = true;
    mini.setView([lat, lon], Math.max(mini.getZoom(), 15), { animate: false });
    movingByCode = false;
  }
  if (!keepPlace) {
    const near = nearestPlace(lat, lon);
    if (near && near.d < 0.15) { usePlace(near.place); renderWhere(); return; }
    if (st.place.existing) st.place.existing = null;
  }
  renderWhere();
  if (lookup) {
    clearTimeout(lookupTimer);
    lookupTimer = setTimeout(async () => {
      const at = st?.loc;
      if (!at) return;
      try {
        const r = await geo.reverse(at.lat, at.lon);
        if (!r || !st || st.loc !== at || st.place.existing) return;
        setPlaceFields({ ...r, name: st.place.nameSet ? st.place.name : r.name });
      } catch { /* offline: fill in by hand */ }
    }, 700);
  }
}

function nearestPlace(lat, lon) {
  let best = null;
  for (const p of lib.own().places) {
    const d = km({ lat, lon }, p);
    if (!best || d < best.d) best = { place: p, d };
  }
  return best;
}

function usePlace(pl) {
  st.place = { name: pl.name, city: pl.city, country: pl.country, existing: pl.id, nameSet: true };
  setPlaceFields(st.place);
}

function setPlaceFields(p) {
  st.place = { ...st.place, name: p.name ?? st.place.name, city: p.city ?? st.place.city, country: p.country ?? st.place.country };
  $('cap-place').value = st.place.name || '';
  $('cap-city').value = st.place.city || '';
  $('cap-country').value = st.place.country || '';
  renderWhere();
}

function renderWhere() {
  const el = $('cap-where');
  if (!st.loc) { el.innerHTML = 'Search for the place, use where you are, or zoom the map in and put the spot under the cross.'; return; }
  const near = !st.place.existing && nearestPlace(st.loc.lat, st.loc.lon);
  const suggestion = near && near.d < 1 ? ` <button type="button" class="link" data-use="${near.place.id}">At ${esc(near.place.name)}?</button>` : '';
  el.innerHTML = st.place.existing
    ? `A place you’ve been before: <b>${esc(st.place.name)}</b>. Move the map to make it a new place.`
    : `${st.loc.lat.toFixed(4)}, ${st.loc.lon.toFixed(4)}. Move the map to adjust.${suggestion}`;
}

async function find() {
  const q = $('cap-q').value.trim();
  if (!q) return;
  $('cap-find').disabled = true;
  try {
    st.results = await geo.search(q);
    $('cap-results').innerHTML = st.results.length
      ? st.results.map((r, i) => `<li><button type="button" data-r="${i}"><span>${esc(r.name)}</span><small>${esc([r.city, r.country].filter(Boolean).join(', '))}</small></button></li>`).join('')
      : '<li class="none">Nothing found. Try a town, or move the map.</li>';
    $('cap-results').hidden = false;
  } catch (e) {
    hooks.toast(navigator.onLine ? e.message : 'Searching needs a connection. Move the map instead.');
  } finally {
    $('cap-find').disabled = false;
  }
}

function here() {
  if (!navigator.geolocation) return hooks.toast('This device can’t tell where it is.');
  $('cap-here').disabled = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => { $('cap-here').disabled = false; setLocation(pos.coords.latitude, pos.coords.longitude); },
    () => { $('cap-here').disabled = false; hooks.toast('Couldn’t get your location.'); },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
  );
}

// ---------- chips ----------

function renderChips() {
  $('cap-kind').innerHTML = Object.entries(lib.KINDS).map(([k, v]) => `<button type="button" class="chip" data-kind="${k}" style="--k:var(--k-${k})" ${pressed(st.kind === k)}><span class="dot"></span>${v.label}</button>`).join('');
  const people = [...lib.view().people, ...st.newPeople];
  $('cap-with').innerHTML = people.map((p) => `<button type="button" class="chip" data-with="${p.id}" ${pressed(st.with.has(p.id))}><span class="av">${esc(p.initial)}</span>${esc(p.name)}</button>`).join('')
    + '<button type="button" class="chip more" data-add-person>+ Someone else</button>';
  $('cap-by').innerHTML = [['stefan', 'Stefan'], ['marleen', 'Marleen']].map(([v, l]) => `<button type="button" data-by="${v}" ${pressed(st.by === v)}>${l}</button>`).join('');
}

function trips() {
  const all = [...lib.own().trips, ...(st.newTrip ? [st.newTrip] : [])];
  return all.sort((a, b) => b.start.localeCompare(a.start));
}

// A trip whose dates are within a few days of this memory is probably the one.
function guessTrip() {
  if (st.tripSet) return;
  const t = trips().find((x) => addDays(x.start, -3) <= st.date && st.date <= addDays(x.end, 3));
  st.trip = t ? t.id : '';
}

function renderTrips() {
  const list = trips().slice(0, 10);
  $('cap-trip').innerHTML = `<button type="button" class="chip" data-trip="" ${pressed(!st.trip)}>No trip</button>`
    + list.map((t) => `<button type="button" class="chip" data-trip="${t.id}" ${pressed(st.trip === t.id)}>${esc(t.title)} <span style="opacity:.55">${t.start.slice(0, 4)}</span></button>`).join('')
    + '<button type="button" class="chip more" data-new-trip>+ New trip</button>';
}

// ---------- text ↔ memory ----------

const QUOTE = /^[“"]([\s\S]*?)[”"]?$/;

function textOf(m) {
  if (m.body) return m.body.filter((b) => b.p).map((b) => b.p).join('\n\n');
  if (m.quote) return `“${m.quote}”`;
  return m.note || '';
}

// One paragraph: a note (or a quote, when it starts with a quotation mark). More paragraphs
// or photos: a story, with the extra photos set between the paragraphs.
function textFields(text, refs) {
  const paras = text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  if (paras.length <= 1 && refs.length <= 1) {
    const t = paras[0] || '';
    if (!t) return {};
    const q = t.match(QUOTE);
    return q && /^[“"]/.test(t) ? { quote: q[1].trim() } : { note: t };
  }
  const rest = refs.slice(1);
  const body = [];
  paras.forEach((p, i) => {
    body.push({ p });
    let k = Math.ceil(rest.length / (paras.length - i));
    while (k > 0 && rest.length) {
      if (k >= 2 && rest.length >= 2) { body.push({ imgs: rest.splice(0, 2) }); k -= 2; } else { body.push({ img: rest.shift() }); k -= 1; }
    }
  });
  while (rest.length) body.push(rest.length >= 2 ? { imgs: rest.splice(0, 2) } : { img: rest.shift() });
  return { body };
}

// ---------- save ----------

async function save() {
  st.title = $('cap-title').value.trim();
  st.text = $('cap-text').value.trim();
  if (st.busy) return hooks.toast('Still preparing photos…');
  if (!st.title) { $('cap-title').focus(); return hooks.toast('Give it a title.'); }
  if (!st.loc) return hooks.toast('Where was it? Search, use your location, or move the map.');
  if (!st.place.name.trim()) { $('cap-place').focus(); return hooks.toast('Name the place.'); }

  const places = [];
  let placeId = st.place.existing;
  if (!placeId) {
    placeId = lib.newId('pl-');
    places.push({ id: placeId, name: st.place.name.trim(), city: st.place.city.trim(), country: st.place.country.trim(), lat: st.loc.lat, lon: st.loc.lon });
  }
  const refs = st.photos.map((p) => p.ref).filter(Boolean);
  const memory = {
    id: st.id || lib.newId('m-'),
    place: placeId, date: st.date, kind: st.kind, tags: st.keep.tags, ...(st.keep.collections ? { collections: st.keep.collections } : {}), trip: st.trip || null,
    by: st.by, with: [...st.with].length ? [...st.with] : [st.by],
    title: st.title, photo: refs[0] || null,
    ...textFields(st.text, refs),
    createdAt: st.created || Date.now(),
  };
  const trips = st.newTrip && st.trip === st.newTrip.id ? [{ ...st.newTrip, with: memory.with }] : [];
  const people = st.newPeople.filter((p) => memory.with.includes(p.id));
  const photos = st.photos.filter((p) => p.master).map((p) => ({ id: p.id, master: p.master, thumb: p.thumb }));
  if (!lib.me()) lib.setMe(st.by);
  await lib.saveMemory(memory, { places, trips, people, photos });
  close();
  hooks.toast(lib.status().connected ? 'Saved. Syncing to Dropbox…' : 'Saved on this phone.');
  hooks.onSaved?.(memory);
}
