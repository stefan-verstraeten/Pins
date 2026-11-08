// Countries: the world with every visited country coloured in.
// A country lights up when it has memories (coloured by the time of the first one), or when
// it has been marked as visited by hand: places you've been but haven't recorded.

import { unwrapGeo } from './geo.js';

const L = window.L;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Our place names → Natural Earth names (used by world-atlas). The real data model will store ISO codes.
const ALIAS = { 'United States': 'United States of America', 'Czech Republic': 'Czechia' };
// world-atlas draws these as one shape each; subunits-50m.json (Natural Earth map units) splits them:
// the UK into its four nations, and France, Norway and the Netherlands into home country and
// overseas parts, so a trip to Paris doesn't colour in French Guiana.
const SPLIT = new Set(['United Kingdom', 'France', 'Norway', 'Netherlands']);
const DISPLAY = { 'United States of America': 'United States', Vatican: 'Vatican City' };
const shown = (name) => DISPLAY[name] || name;
const MARK_KEY = 'pins.countries.marked';

export function initCountries({ PINS, placeById, colourAt, timeT, onOpen }) {
  let marked = new Set();
  try { marked = new Set(JSON.parse(localStorage.getItem(MARK_KEY)) || []); } catch { /* private mode */ }
  const saveMarked = () => { try { localStorage.setItem(MARK_KEY, JSON.stringify([...marked])); } catch { /* private mode */ } };

  // Per country: memories, first and last memory.
  const stats = {};
  for (const p of PINS) {
    const raw = placeById[p.place].country;
    const name = ALIAS[raw] || raw;
    const s = (stats[name] ||= { n: 0, first: p, last: p, shown: DISPLAY[name] || name });
    s.n++;
    if (p.date < s.first.date) s.first = p;
    if (p.date > s.last.date) s.last = p;
  }

  let map = null;
  let layer = null;
  let dots = null;
  let features = [];
  let marking = false;

  const fillOf = (name) => {
    if (stats[name]) return `rgb(${colourAt(timeT(stats[name].first)).join(',')})`;
    if (marked.has(name)) return '#BDB8A2';
    return null;
  };
  const style = (f) => {
    const fill = fillOf(f.properties.name);
    return fill
      ? { color: '#6F7064', weight: 0.6, opacity: 0.9, fillColor: fill, fillOpacity: 0.9 }
      : { color: '#A9A898', weight: 0.5, opacity: 0.9, fillColor: '#F3EEE3', fillOpacity: 1 };
  };

  function info(name) {
    const s = stats[name];
    const el = $('c-info');
    if (!name) { el.innerHTML = marking ? 'Tap a country to mark it as visited, or tap again to unmark it.' : 'Tap a country for details.'; return; }
    if (s) {
      const y0 = s.first.date.slice(0, 4); const y1 = s.last.date.slice(0, 4);
      el.innerHTML = `<b>${esc(s.shown)}</b> · ${s.n} ${s.n === 1 ? 'memory' : 'memories'} · ${y0 === y1 ? y0 : `${y0}–${y1}`}`;
    } else if (marked.has(name)) el.innerHTML = `<b>${esc(shown(name))}</b> · visited, no memories yet`;
    else el.innerHTML = `<b>${esc(shown(name))}</b> · not yet`;
  }

  function onCountry(f) {
    const name = f.properties.name;
    if (marking) {
      if (stats[name]) { info(name); $('c-info').innerHTML += ' · coloured by its memories'; return; }
      if (marked.has(name)) marked.delete(name); else marked.add(name);
      saveMarked();
      refresh();
    }
    info(name);
  }

  function drawDots() {
    // Small countries vanish at world scale; give each visited one a dot. While marking,
    // the others get a hollow dot too, so the Vatican or Monaco can be tapped at all.
    dots.clearLayers();
    // Hollow dots first, so coloured ones sit on top where they crowd (around the Adriatic).
    const order = [...features].sort((a, b) => !!fillOf(a.properties.name) - !!fillOf(b.properties.name));
    for (const f of order) {
      const name = f.properties.name;
      const fill = fillOf(name);
      if ((!fill && !marking) || !f._bounds) continue;
      const b = f._bounds;
      if (b.getNorth() - b.getSouth() > 2.5 || b.getEast() - b.getWest() > 2.5) continue;
      const style = fill
        ? { radius: 4.5, color: '#42443D', weight: 0.8, fillColor: fill, fillOpacity: 1 }
        : { radius: 4.5, color: '#8A8B7C', weight: 1, fillColor: '#F9F6EF', fillOpacity: 0.9 };
      L.circleMarker(b.getCenter(), style).on('click', () => onCountry(f)).addTo(dots);
    }
  }

  function list() {
    const rows = Object.keys(stats).map((name) => ({ name, s: stats[name] }))
      .sort((a, b) => a.s.first.date.localeCompare(b.s.first.date));
    const extra = [...marked].filter((n) => !stats[n]).sort((a, b) => shown(a).localeCompare(shown(b)));
    const total = rows.length + extra.length;
    $('c-count').textContent = `${total} ${total === 1 ? 'country' : 'countries'}${extra.length ? ` · ${extra.length} without memories` : ''}`;
    $('c-list').innerHTML = rows.map(({ name, s }) => {
      const y0 = s.first.date.slice(0, 4);
      return `<li><i style="background:rgb(${colourAt(timeT(s.first)).join(',')})"></i><span class="c-name">${esc(s.shown)}</span><span class="c-meta num">${s.n} · since ${y0}</span></li>`;
    }).join('') + extra.map((n) => `<li class="marked"><i></i><span class="c-name">${esc(shown(n))}</span><span class="c-meta">no memories</span></li>`).join('');
  }

  function refresh() {
    if (layer) { layer.setStyle(style); drawDots(); }
    list();
  }

  async function build() {
    map = L.map('cmap', {
      zoomControl: false, attributionControl: false, zoomSnap: 0.25, minZoom: 0.5, maxZoom: 7,
      maxBounds: [[-70, -200], [85, 200]], maxBoundsViscosity: 0.8,
    });
    const [topo, sub] = await Promise.all(['vendor/countries-50m.json', 'vendor/subunits-50m.json'].map((u) => fetch(u).then((r) => r.json())));
    const geo = unwrapGeo(window.topojson.feature(topo, topo.objects.countries));
    geo.features = geo.features.filter((f) => f.properties.name !== 'Antarctica' && !SPLIT.has(f.properties.name)).concat(sub.features);
    layer = L.geoJSON(geo, {
      style,
      onEachFeature: (f, l) => { f._bounds = l.getBounds(); features.push(f); l.on('click', () => onCountry(f)); },
    }).addTo(map);
    dots = L.layerGroup().addTo(map);
    drawDots();
    fit();
  }
  const fit = () => { map.invalidateSize(); map.fitBounds([[-52, -168], [78, 180]], { padding: [6, 6] }); };

  function open() {
    onOpen?.();
    $('countries').hidden = false;
    list();
    info(null);
    if (!map) build(); else requestAnimationFrame(fit);
  }
  function close() { $('countries').hidden = true; setMarking(false); }
  function setMarking(on) {
    marking = on;
    $('c-mark').setAttribute('aria-pressed', String(on));
    $('c-mark').textContent = on ? 'Done' : 'Mark visited';
    $('countries').classList.toggle('marking', on);
    if (dots) drawDots();
    info(null);
  }

  $('c-close').addEventListener('click', close);
  $('c-mark').addEventListener('click', () => setMarking(!marking));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('countries').hidden) close(); });
  window.addEventListener('resize', () => { if (map && !$('countries').hidden) map.invalidateSize(); });

  return { open, close, refresh };
}
