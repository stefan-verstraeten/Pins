// Pins — map prototype. The map is home; everything else layers over it.
import { PEOPLE, KINDS, PLACES, TRIPS, COLLECTIONS, PINS } from '../sample/data.js';
import { RAMPS, DEFAULT_RAMP, ramp } from './ramps.js';
import { unwrapGeo, km } from './geo.js';
import { initCountries } from './countries.js';

const L = window.L;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const placeById = Object.fromEntries(PLACES.map((p) => [p.id, p]));
const tripById = Object.fromEntries(TRIPS.map((t) => [t.id, t]));
const personById = Object.fromEntries(PEOPLE.map((p) => [p.id, p]));
const collById = Object.fromEntries(COLLECTIONS.map((c) => [c.id, c]));
const year = (p) => +p.date.slice(0, 4);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (d) => { const [y, m, day] = d.split('-'); return `${+day} ${MONTHS[m - 1]} ${y}`; };
const img = (name) => `sample/img/${name}.jpg`;
const photoUrl = (p) => img(p.photo);
const isStory = (p) => Array.isArray(p.body);
const storyPhotos = (p) => (p.body || []).flatMap((b) => (b.img ? [b.img] : b.imgs || []));
const photoCount = (p) => new Set([p.photo, ...storyPhotos(p)].filter(Boolean)).size;
let CREDITS = {};
fetch('sample/credits.json').then((r) => r.json()).then((c) => { CREDITS = c; }).catch(() => {});
const expression = (p) => (p.photo ? 'photo' : p.quote ? 'text' : 'sym');

const YEARS = PINS.map(year);
const Y0 = Math.min(...YEARS);
const Y1 = Math.max(...YEARS);

// ---------- filter state ----------

const blank = () => ({ kinds: [], with: [], alone: false, by: 'any', sets: [], from: Y0, to: Y1 });
let F = blank();

function passes(p, f = F, { ignoreTime = false } = {}) {
  if (f.kinds.length && !f.kinds.some((k) => p.kind === k || p.tags.includes(k))) return false;
  if (f.alone && p.with.length !== 1) return false;
  if (f.with.length && !f.with.every((w) => p.with.includes(w))) return false;
  if (f.by !== 'any' && p.by !== f.by) return false;
  if (f.sets.length && !f.sets.some((s) => p.trip === s || (p.collections || []).includes(s))) return false;
  if (!ignoreTime && (year(p) < f.from || year(p) > f.to)) return false;
  return true;
}
const filtered = () => PINS.filter((p) => passes(p));
const activeCount = () => F.kinds.length + F.with.length + (F.alone ? 1 : 0) + (F.by !== 'any' ? 1 : 0) + F.sets.length + (F.from !== Y0 || F.to !== Y1 ? 1 : 0);

// ---------- map ----------

const map = L.map('map', {
  zoomControl: false, attributionControl: false, worldCopyJump: false, zoomSnap: 0.25, zoomDelta: 0.75, wheelPxPerZoomLevel: 90,
  maxBounds: [[-75, -200], [85, 200]], maxBoundsViscosity: 0.8, minZoom: 1.5, maxZoom: 18,
}).setView([30, 20], 2);
L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map);
window.pinsMap = map; // handy in the console

// The atlas: Natural Earth land, drawn as a quiet engraving. Character when zoomed out.
map.createPane('atlas').style.zIndex = 150;
map.getPane('atlas').classList.add('leaflet-atlas-pane');
map.createPane('labels').style.zIndex = 350;
map.getPane('labels').classList.add('leaflet-labels-pane');

const atlasRenderer = L.svg({ pane: 'atlas', padding: 0.5 });
(async () => {
  const [land, countries] = await Promise.all([
    fetch('vendor/land-50m.json').then((r) => r.json()),
    fetch('vendor/countries-50m.json').then((r) => r.json()),
  ]);
  // Graticule first, so land sits over it.
  const grat = [];
  for (let lon = -180; lon <= 180; lon += 30) grat.push([[-80, lon], [85, lon]]);
  for (let lat = -60; lat <= 80; lat += 20) grat.push([[lat, -180], [lat, 180]]);
  L.polyline(grat, { renderer: atlasRenderer, pane: 'atlas', color: '#42443D', weight: 0.6, opacity: 0.1, dashArray: '1 5', interactive: false }).addTo(map);
  const landGeo = unwrapGeo(topojson.feature(land, land.objects.land));
  L.geoJSON(landGeo, {
    renderer: atlasRenderer, pane: 'atlas', interactive: false,
    style: { color: '#6F7064', weight: 0.7, opacity: 0.75, fillColor: '#F3EEE3', fillOpacity: 1 },
  }).addTo(map);
  L.geoJSON(topojson.mesh(countries, countries.objects.countries, (a, b) => a !== b), {
    renderer: atlasRenderer, pane: 'atlas', interactive: false,
    style: { color: '#A9A898', weight: 0.6, opacity: 0.9, dashArray: '2 3', fill: false },
  }).addTo(map);
})();

const ATLAS_LABELS = [
  ['Atlantic Ocean', 'ocean', 28, -38], ['Pacific Ocean', 'ocean', 12, -150], ['Pacific Ocean', 'ocean', 8, 168],
  ['Indian Ocean', 'ocean', -18, 78], ['Southern Ocean', 'ocean', -58, 20],
  ['Europe', 'continent', 52, 18], ['Asia', 'continent', 48, 92], ['Africa', 'continent', 6, 20],
  ['North America', 'continent', 46, -102], ['South America', 'continent', -14, -58], ['Oceania', 'continent', -25, 134],
];
for (const [text, cls, lat, lon] of ATLAS_LABELS) {
  L.marker([lat, lon], { pane: 'atlas', interactive: false, keyboard: false, icon: L.divIcon({ className: '', iconSize: [0, 0], html: `<div class="${cls}-label">${text}</div>` }) }).addTo(map);
}

// The precise map: Esri's Light Gray Canvas (from OpenStreetMap and other sources), warmed by CSS.
// It fades in as you zoom, taking over from the atlas.
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas';
L.tileLayer(`${ESRI}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`, {
  minZoom: 4, maxZoom: 19, maxNativeZoom: 16,
  attribution: 'Esri, HERE, Garmin, © OpenStreetMap contributors',
}).addTo(map);
L.tileLayer(`${ESRI}/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, {
  minZoom: 5, maxZoom: 19, maxNativeZoom: 16, pane: 'labels',
}).addTo(map);

// Recolour the grey tiles as a duotone: water becomes sea wash, land becomes paper, text becomes ink.
(function warmFilter() {
  const stops = [[0, [47, 49, 43]], [0.55, [120, 122, 112]], [0.8, [218, 226, 221]], [0.83, [220, 227, 222]], [0.925, [243, 238, 227]], [1, [249, 246, 239]]];
  const at = (t, ch) => {
    for (let i = 1; i < stops.length; i++) {
      const [t1, c1] = stops[i]; const [t0, c0] = stops[i - 1];
      if (t <= t1) return (c0[ch] + (c1[ch] - c0[ch]) * ((t - t0) / (t1 - t0))) / 255;
    }
    return stops[stops.length - 1][1][ch] / 255;
  };
  const table = (ch) => Array.from({ length: 101 }, (_, i) => at(i / 100, ch).toFixed(3)).join(' ');
  document.body.insertAdjacentHTML('beforeend', `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="warm" color-interpolation-filters="sRGB">
    <feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer><feFuncR type="table" tableValues="${table(0)}"/><feFuncG type="table" tableValues="${table(1)}"/><feFuncB type="table" tableValues="${table(2)}"/></feComponentTransfer>
  </filter></svg>`);
})();

function blend() {
  const z = map.getZoom();
  const t = Math.min(1, Math.max(0, (z - 4.25) / 1.75)); // 0 at z4.25, 1 at z6
  map.getPane('tilePane').style.opacity = t;
  map.getPane('labels').style.opacity = Math.min(1, Math.max(0, (z - 5.5) / 1.5));
  map.getPane('atlas').style.opacity = 1 - t;
  const el = map.getContainer();
  el.classList.toggle('z-far', z < 4.5);
  el.classList.toggle('z-mid', z >= 4.5 && z < 11);
  el.classList.toggle('z-near', z >= 11);
  // Bars are the landscape; up close, at street level, the photographic pins take over.
  const near = z >= Z_PINS;
  if (near !== map.hasLayer(clusters)) { if (near) map.addLayer(clusters); else map.removeLayer(clusters); }
  drawBars();
}
map.on('zoomend', blend);

function fitMinZoom() {
  // Never show the world smaller than the window.
  const z = Math.log2(Math.max(window.innerWidth, window.innerHeight * 1.4) / 256);
  map.setMinZoom(Math.max(1, Math.floor(z * 4) / 4));
}
window.addEventListener('resize', fitMinZoom);
fitMinZoom();

// ---------- markers ----------

const glyph = (k) => `<svg viewBox="0 0 24 24">${KINDS[k].glyph}</svg>`;

function pinHtml(rep, visits, selected) {
  const ex = expression(rep);
  const inner = ex === 'photo' ? `<img src="${photoUrl(rep)}" alt="" loading="lazy">`
    : ex === 'text' ? `<span>${esc(rep.title.replace(/^[“"'‘]/, '')[0])}</span>` : glyph(rep.kind);
  const badge = visits > 1 ? `<i class="visits">${visits}</i>` : '';
  const label = `<div class="pin-label">${esc(placeById[rep.place].name)}</div>`;
  return `<div class="pin-wrap"><div class="pin ${ex} k-${rep.kind}${isStory(rep) ? ' story' : ''}${selected ? ' sel' : ''}">${inner}${badge}</div>${label}</div>`;
}

let selectedPlace = null;

const clusters = L.markerClusterGroup({
  maxClusterRadius: (z) => (z < 4 ? 75 : z < 8 ? 56 : 40),
  showCoverageOnHover: false, spiderfyOnMaxZoom: true, disableClusteringAtZoom: 13,
  iconCreateFunction(cluster) {
    const kids = cluster.getAllChildMarkers();
    const n = kids.reduce((s, m) => s + m.options.visits.length, 0);
    const size = Math.round(28 + 9 * Math.log2(n));
    const withPhoto = kids.map((m) => m.options.rep).find((p) => p.photo);
    if ((cluster._zoom ?? map.getZoom()) >= 5 && withPhoto) {
      const s = Math.max(46, size + 6);
      return L.divIcon({ className: '', iconSize: [0, 0], html: `<div class="cluster photo" style="--s:${s}px"><img src="${photoUrl(withPhoto)}" alt=""><span class="n">${n}</span></div>` });
    }
    return L.divIcon({ className: '', iconSize: [0, 0], html: `<div class="cluster" style="--s:${size}px">${n}</div>` });
  },
});
clusters.on('clusterclick', (e) => { e.layer.zoomToBounds({ paddingTopLeft: [60, 170], paddingBottomRight: [80, $('bottom').offsetHeight + 40] }); });

let markerByPlace = {};

function drawMarkers() {
  clusters.clearLayers();
  markerByPlace = {};
  const byPlace = {};
  for (const p of filtered()) (byPlace[p.place] ||= []).push(p);
  const markers = [];
  for (const [pid, visits] of Object.entries(byPlace)) {
    visits.sort((a, b) => b.date.localeCompare(a.date));
    const rep = visits.find((v) => v.photo) || visits[0];
    const pl = placeById[pid];
    const m = L.marker([pl.lat, pl.lon], {
      rep, visits, keyboard: true, title: pl.name, riseOnHover: true,
      icon: L.divIcon({ className: '', iconSize: [0, 0], html: pinHtml(rep, visits.length, pid === selectedPlace) }),
    });
    m.on('click', () => openPlace(pid));
    markerByPlace[pid] = m;
    markers.push(m);
  }
  clusters.addLayers(markers);
}

function setSelected(pid) {
  const prev = selectedPlace;
  selectedPlace = pid;
  if (prev !== pid) drawBars();
  for (const id of [prev, pid]) {
    const m = id && markerByPlace[id];
    if (m) m.setIcon(L.divIcon({ className: '', iconSize: [0, 0], html: pinHtml(m.options.rep, m.options.visits.length, id === pid) }));
  }
}

// ---------- bars: the landscape of memories ----------
// Every memory is a vertical bar at its place. Colour = when (oldest → newest in the whole
// atlas); height = weight, from richness (words, photos) and density (memories nearby).
// Big trips rise as mountain ranges, short ones as hills.

const Z_PINS = 12;
const day = (d) => Date.parse(d) / 864e5;
const T0 = Math.min(...PINS.map((p) => day(p.date)));
const T1 = Math.max(...PINS.map((p) => day(p.date)));
const timeT = (p) => (T1 > T0 ? (day(p.date) - T0) / (T1 - T0) : 1);

const RAMP_KEY = 'pins.ramp';
let rampId = (() => { try { return RAMPS[localStorage.getItem(RAMP_KEY)] ? localStorage.getItem(RAMP_KEY) : DEFAULT_RAMP; } catch { return DEFAULT_RAMP; } })();
const colourOf = (p) => ramp(rampId)(timeT(p));

const wordCount = (p) => [p.title, p.note, p.quote, p.standfirst, ...(p.body || []).map((b) => b.p || b.caption)]
  .filter(Boolean).join(' ').split(/\s+/).length;
const richness = (p) => 1 + 0.6 * Math.min(photoCount(p), 8) + Math.min(wordCount(p), 400) / 80;

// Density: a Gaussian sum over memories within ~100 km (σ = 40 km), using a 1° grid so it
// stays fast with tens of thousands of memories.
const SIGMA = 40;
const WEIGHT = (() => {
  const cell = (pl) => `${Math.floor(pl.lat)},${Math.floor(pl.lon)}`;
  const grid = {};
  for (const p of PINS) (grid[cell(placeById[p.place])] ||= []).push(p);
  const w = {};
  for (const p of PINS) {
    const a = placeById[p.place];
    const cy = Math.floor(a.lat); const cx = Math.floor(a.lon);
    let d = 0;
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
      for (const q of grid[`${cy + i},${cx + j}`] || []) {
        if (q === p) continue;
        const k = km(a, placeById[q.place]);
        if (k < SIGMA * 3) d += Math.exp(-((k / SIGMA) ** 2));
      }
    }
    w[p.id] = Math.sqrt(richness(p)) * (1 + 0.8 * Math.log2(1 + d));
  }
  const max = Math.max(...Object.values(w));
  for (const id in w) w[id] /= max;
  return w;
})();

map.createPane('bars').style.zIndex = 450;
const barCanvas = L.canvas({ pane: 'bars', padding: 0.4 });
map.addLayer(barCanvas);
barCanvas._container.style.pointerEvents = 'none';
// Leaflet's canvas clears itself and calls _draw() whenever the view changes; we paint the bars there.
barCanvas._draw = paintBars;
function drawBars() { if (barCanvas._map && barCanvas._ctx) barCanvas._redraw(); }

let hits = [];
const shade = ([r, g, b], f) => `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
const tint = ([r, g, b], f) => `rgb(${Math.round(r + (255 - r) * f)},${Math.round(g + (255 - g) * f)},${Math.round(b + (255 - b) * f)})`;

function paintBars() {
  const ctx = barCanvas._ctx;
  hits = [];
  const z = map.getZoom();
  if (z >= Z_PINS) return;

  const bw = z < 3 ? 4 : z < 6 ? 5 : z < 9 ? 6 : 7;
  const hMax = Math.min(150, 60 + 12 * z);
  const byPlace = {};
  for (const p of filtered()) (byPlace[p.place] ||= []).push(p);
  const items = [];
  for (const [pid, ps] of Object.entries(byPlace)) {
    const pl = placeById[pid];
    const pt = map.latLngToLayerPoint([pl.lat, pl.lon]);
    ps.sort((a, b) => a.date.localeCompare(b.date));
    // Several memories at one place spread into a small cluster of bars (golden-angle spiral,
    // flattened as if seen at an angle), so a place you keep returning to becomes a little massif.
    ps.forEach((p, i) => {
      const r = i ? bw * 0.8 * Math.sqrt(i) : 0;
      const a = i * 2.39996;
      items.push({ p, x: pt.x + r * Math.cos(a), y: pt.y + r * Math.sin(a) * 0.45, h: 4 + (hMax - 4) * WEIGHT[p.id] ** 1.3 });
    });
  }
  // Paint from the back (north, top of the screen) to the front.
  items.sort((a, b) => a.y - b.y);

  // First every cast shadow, so they fall across the ground (and the foot of peaks behind)
  // without darkening the faces of peaks in front.
  ctx.save();
  ctx.fillStyle = 'rgba(52,48,62,.11)';
  ctx.shadowColor = 'rgba(52,48,62,.22)';
  ctx.shadowBlur = 4;
  for (const it of items) ctx.fill(shadowPath(it.x, it.y, bw, it.h));
  ctx.restore();

  for (const it of items) {
    const c = colourOf(it.p);
    const peak = peakPath(it.x, it.y, bw, it.h);
    const rb = peakHalfWidth(bw, it.h);
    // Lit from the left: the sunny flank pale, the far flank in shade.
    const g = ctx.createLinearGradient(it.x - rb * 0.6, 0, it.x + rb * 0.6, 0);
    g.addColorStop(0, tint(c, 0.4));
    g.addColorStop(0.42, `rgb(${c.join(',')})`);
    g.addColorStop(0.58, shade(c, 0.8));
    g.addColorStop(1, shade(c, 0.62));
    ctx.fillStyle = g;
    ctx.fill(peak);
    // A paper rim keeps neighbouring peaks legible inside a range.
    ctx.strokeStyle = 'rgba(249,246,239,.55)'; ctx.lineWidth = 0.5;
    ctx.stroke(peak);
    if (it.p.place === selectedPlace) {
      ctx.strokeStyle = '#2F312B'; ctx.lineWidth = 1.4;
      ctx.stroke(peak);
    }
    hits.push({ p: it.p, x0: it.x - Math.max(bw * 0.6, rb * 0.4), x1: it.x + Math.max(bw * 0.6, rb * 0.4), y0: it.y - it.h, y1: it.y + 2 });
  }
}

// One peak: a spire with concave flanks — a needle summit sweeping out into a broad,
// low skirt — standing on an elliptical footprint. The skirt widens with height, so
// neighbouring peaks run together into ranges.
const peakHalfWidth = (bw, h) => Math.max(bw * 0.7, h * 0.26);
const CONCAVE = 2.8;
const profile = (u) => (1 - Math.abs(u)) ** CONCAVE;
function peakPath(cx, y, bw, h) {
  const rb = peakHalfWidth(bw, h);
  const ry = Math.min(rb * 0.28, 4);
  const path = new Path2D();
  const N = 40;
  for (let k = 0; k <= N; k++) {
    const u = -1 + (2 * k) / N;
    const py = y - h * profile(u);
    if (k) path.lineTo(cx + u * rb, py); else path.moveTo(cx + u * rb, py);
  }
  path.ellipse(cx, y, rb, ry, 0, 0, Math.PI);
  path.closePath();
  return path;
}
// Its shadow, laid on the ground away from the light: long to the right, slightly back.
function shadowPath(cx, y, bw, h) {
  const rb = peakHalfWidth(bw, h);
  const path = new Path2D();
  const N = 24;
  for (let k = 0; k <= N; k++) {
    const u = -1 + (2 * k) / N;
    const up = h * profile(u);
    const px = cx + u * rb + up * 0.62;
    const py = y - up * 0.16;
    if (k) path.lineTo(px, py); else path.moveTo(px, py);
  }
  path.ellipse(cx, y, rb, Math.min(rb * 0.28, 4), 0, 0, Math.PI);
  path.closePath();
  return path;
}

function barAt(pt) {
  const pad = 7;
  for (let i = hits.length - 1; i >= 0; i--) {
    const h = hits[i];
    if (pt.x >= h.x0 - pad && pt.x <= h.x1 + pad && pt.y >= h.y0 - pad && pt.y <= h.y1 + pad) return h.p;
  }
  return null;
}
map.on('mousemove', (e) => { map.getContainer().style.cursor = barAt(e.layerPoint) ? 'pointer' : ''; });

function legend() {
  $('lg-ramp').style.background = ramp(rampId).css(10);
  $('lg-from').textContent = new Date(T0 * 864e5).getUTCFullYear();
  $('lg-to').textContent = new Date(T1 * 864e5).getUTCFullYear();
}

function setRamp(id) {
  rampId = id;
  try { localStorage.setItem(RAMP_KEY, id); } catch { /* private mode */ }
  legend();
  drawBars();
  countries.refresh();
}

// ---------- tally & strip ----------

function tally() {
  const pins = filtered();
  const places = new Set(pins.map((p) => p.place));
  const countries = new Set(pins.map((p) => placeById[p.place].country));
  $('tally').innerHTML = `${pins.length} memories · ${places.size} places · <button class="tally-link" id="btn-countries">${countries.size} countries</button>`;
}

function cardHtml(p) {
  const ex = expression(p);
  const n = photoCount(p);
  const badge = isStory(p) ? `<span class="card-badge">Story${n > 1 ? ` · ${n} photos` : ''}</span>` : '';
  const img = ex === 'photo' ? `<div class="card-img"><img src="${photoUrl(p)}" alt="" loading="lazy">${badge}</div>`
    : ex === 'text' ? `<div class="card-img text"><q>${esc(p.quote)}</q></div>`
    : `<div class="card-img sym">${glyph(p.kind)}</div>`;
  const pl = placeById[p.place];
  return `<button class="card k-${p.kind}" data-place="${p.place}" data-pin="${p.id}">${img}<p class="eyebrow">${esc(pl.city)} · ${year(p)}</p><p class="card-title">${esc(p.title)}</p></button>`;
}

function strip() {
  const b = map.getBounds().pad(-0.02);
  const inView = filtered().filter((p) => b.contains([placeById[p.place].lat, placeById[p.place].lon]))
    .sort((a, b2) => b2.date.localeCompare(a.date));
  $('strip-count').textContent = inView.length === 1 ? 'one memory' : `${inView.length} memories`;
  $('strip-cards').innerHTML = inView.length ? inView.map(cardHtml).join('') : '';
  if (!inView.length) $('strip-cards').innerHTML = '<p class="strip-empty">No memories here yet.</p>';
  layoutBottom();
}
$('strip-cards').addEventListener('click', (e) => {
  const c = e.target.closest('.card');
  if (!c) return;
  const pl = placeById[c.dataset.place];
  map.flyTo([pl.lat, pl.lon], Math.max(map.getZoom(), Z_PINS + 1), { duration: 1.1 });
  openPlace(c.dataset.place, c.dataset.pin);
});
$('strip-toggle').addEventListener('click', () => {
  const s = $('strip');
  s.classList.toggle('collapsed');
  $('strip-toggle').setAttribute('aria-expanded', String(!s.classList.contains('collapsed')));
  layoutBottom();
});

function layoutBottom() {
  document.documentElement.style.setProperty('--bottom-h', `${$('bottom').offsetHeight}px`);
}
new ResizeObserver(layoutBottom).observe($('bottom'));

map.on('moveend', strip);

// ---------- memory sheet ----------

function people(ids) {
  return `<span class="people">${ids.map((id) => `<span class="person"><span class="av">${esc(personById[id].initial)}</span>${esc(personById[id].name)}</span>`).join('')}</span>`;
}

const credit = (name) => {
  const c = CREDITS[name];
  return c ? `<figcaption class="credit">${esc(c.author)} · ${esc(c.license)}</figcaption>` : '';
};
const figure = (name, caption, cls = '') => `<figure class="story-fig ${cls}"><img src="${img(name)}" alt="" loading="lazy">${caption ? `<p class="caption">${esc(caption)}</p>` : ''}${credit(name)}</figure>`;

function storyBody(p) {
  return p.body.map((b) => {
    if (b.p) return `<p class="story-p">${esc(b.p)}</p>`;
    if (b.img) return figure(b.img, b.caption, 'wide');
    if (b.imgs) return `<div class="story-pair">${b.imgs.map((n) => figure(n, '', '')).join('')}</div>${b.caption ? `<p class="caption">${esc(b.caption)}</p>` : ''}`;
    return '';
  }).join('');
}

function visitHtml(p, i) {
  const trip = p.trip && tripById[p.trip];
  const photo = p.photo ? `<figure class="visit-photo${i === 0 ? ' first' : ''}"><img src="${photoUrl(p)}" alt="">${credit(p.photo)}</figure>` : '';
  const withLabel = p.with.length === 1 && p.with[0] === p.by ? 'Alone' : people(p.with);
  const tags = [`<span class="tag k">${esc(KINDS[p.kind].label)}</span>`]
    .concat(p.tags.map((t) => `<span class="tag">${esc(KINDS[t]?.label || t[0].toUpperCase() + t.slice(1))}</span>`))
    .concat((p.collections || []).map((c) => `<span class="tag">${esc(collById[c].title)}</span>`));
  return `<article class="visit memory-k-${p.kind}">
    ${photo}
    <p class="eyebrow">${esc(fmtDate(p.date))}${isStory(p) ? ` · Story · ${photoCount(p)} photos` : ''}</p>
    <h3 class="visit-title${isStory(p) ? ' story-title' : ''}">${esc(p.title)}</h3>
    ${p.standfirst ? `<p class="standfirst">${esc(p.standfirst)}</p>` : ''}
    ${p.note ? `<p class="visit-note">${esc(p.note)}</p>` : ''}
    ${isStory(p) ? `<div class="story">${storyBody(p)}</div>` : ''}
    ${p.quote ? `<p class="visit-quote">${esc(p.quote)}</p>` : ''}
    <dl class="facts">
      <dt>With</dt><dd>${withLabel}</dd>
      <dt>Recorded by</dt><dd>${esc(personById[p.by].name)}</dd>
      ${trip ? `<dt>Trip</dt><dd>${esc(trip.title)}, ${MONTHS[+trip.start.slice(5, 7) - 1]} ${trip.start.slice(0, 4)}</dd>` : ''}
    </dl>
    <div class="tags">${tags.join('')}</div>
  </article>`;
}

function openPlace(pid, pinId) {
  const pl = placeById[pid];
  let visits = filtered().filter((p) => p.place === pid).sort((a, b) => b.date.localeCompare(a.date));
  if (pinId) visits = visits.sort((a, b) => (a.id === pinId ? -1 : b.id === pinId ? 1 : 0));
  const head = visits.length > 1 || !visits[0]?.photo
    ? `<header class="place-head"><p class="eyebrow">${visits.length > 1 ? `${visits.length} visits` : 'Place'}</p><h2 class="place-name">${esc(pl.name)}</h2><p class="place-sub">${esc(pl.city)}, ${esc(pl.country)}</p></header>`
    : '';
  const body = visits.map((v, i) => visitHtml(v, head ? 1 : i)).join('');
  const foot = !head ? `<p class="place-sub" style="margin-top:4px">${esc(pl.name)} · ${esc(pl.city)}, ${esc(pl.country)}</p>` : '';
  $('memory-body').innerHTML = head + body.replace('</h3>', `</h3>${foot}`);
  $('memory-body').scrollTop = 0;
  $('memory').classList.toggle('reading', visits.some(isStory));
  closeSheet('filters');
  $('memory').hidden = false;
  setSelected(pid);
}

function closeSheet(id) {
  $(id).hidden = true;
  if (id === 'memory') setSelected(null);
  if (id === 'filters') $('btn-filter').setAttribute('aria-expanded', 'false');
}
document.addEventListener('click', (e) => {
  const c = e.target.closest('[data-close]');
  if (c) closeSheet(c.dataset.close);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeSheet('memory'); closeSheet('filters'); }
});
map.on('click', (e) => {
  const p = map.getZoom() < Z_PINS && barAt(e.layerPoint);
  if (p) openPlace(p.place, p.id);
  else closeSheet('memory');
});

// ---------- filters ----------

const SAVED_KEY = 'pins.views';
const DEFAULT_VIEWS = [
  { name: 'Culture with Marleen', f: { ...blank(), kinds: ['culture'], with: ['marleen'], from: 2023, to: Y1 } },
  { name: 'Memorable tables', f: { ...blank(), sets: ['tables'] } },
  { name: 'Places I saw alone', f: { ...blank(), alone: true } },
];
function savedViews() {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || DEFAULT_VIEWS; } catch { return DEFAULT_VIEWS; }
}
function storeViews(v) { try { localStorage.setItem(SAVED_KEY, JSON.stringify(v)); } catch { /* private mode */ } }

function describe(f) {
  const parts = [];
  if (f.kinds.length) parts.push(f.kinds.map((k) => KINDS[k].label).join(' or '));
  if (f.alone) parts.push('alone');
  if (f.with.length) parts.push(`with ${f.with.map((w) => personById[w].name).join(' & ')}`);
  if (f.by !== 'any') parts.push(`by ${personById[f.by].name}`);
  if (f.sets.length) parts.push(f.sets.map((s) => (tripById[s] || collById[s]).title).join(', '));
  if (f.from !== Y0 || f.to !== Y1) parts.push(f.from === f.to ? `${f.from}` : `${f.from}–${f.to}`);
  return parts.join(' · ') || 'Everything';
}

const pressed = (on) => `aria-pressed="${on ? 'true' : 'false'}"`;

function renderFilters() {
  const kindChips = Object.entries(KINDS).map(([k, v]) => `<button class="chip" data-kind="${k}" style="--k:var(--k-${k})" ${pressed(F.kinds.includes(k))}><span class="dot"></span>${v.label}</button>`).join('');
  const withChips = [`<button class="chip" data-alone ${pressed(F.alone)}>Alone</button>`]
    .concat(PEOPLE.map((p) => `<button class="chip" data-with="${p.id}" ${pressed(F.with.includes(p.id))}><span class="av">${p.initial}</span>${p.name}</button>`)).join('');
  const by = [['any', 'Either of us'], ['stefan', 'Stefan'], ['marleen', 'Marleen']].map(([v, l]) => `<button data-by="${v}" ${pressed(F.by === v)}>${l}</button>`).join('');
  const tripChips = [...TRIPS].sort((a, b) => b.start.localeCompare(a.start)).map((t) => `<button class="chip" data-set="${t.id}" ${pressed(F.sets.includes(t.id))}>${esc(t.title)} <span style="opacity:.55">${t.start.slice(0, 4)}</span></button>`).join('');
  const collChips = COLLECTIONS.map((c) => `<button class="chip" data-set="${c.id}" ${pressed(F.sets.includes(c.id))}>${esc(c.title)}</button>`).join('');
  const views = savedViews().map((v, i) => `<button class="view-row" data-view="${i}"><span><span class="vt">${esc(v.name)}</span><br><span class="vs">${esc(describe(v.f))}</span></span><svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg></button>`).join('');

  const ramps = Object.entries(RAMPS).map(([id, r]) => `<button class="ramp-row" data-ramp="${id}" ${pressed(id === rampId)}><i style="background:${ramp(id).css(10)}"></i><span><span class="vt">${r.name}</span><br><span class="vs">${r.note}</span></span></button>`).join('');
  $('filters-body').innerHTML = `
    <div class="f-group"><p class="eyebrow">Colour of time</p><p class="f-hint">Bars run from your oldest memory to your newest.</p><div class="ramps">${ramps}</div></div>
    <div class="f-group"><p class="eyebrow">Saved views</p><div class="views">${views}</div></div>
    <div class="f-group"><p class="eyebrow">Category</p><div class="chips">${kindChips}</div></div>
    <div class="f-group"><p class="eyebrow">Who was there</p><p class="f-hint">Choose several to find memories you shared.</p><div class="chips">${withChips}</div></div>
    <div class="f-group"><p class="eyebrow">Recorded by</p><div class="seg">${by}</div></div>
    <div class="f-group"><p class="eyebrow">Trips</p><div class="chips">${tripChips}</div></div>
    <div class="f-group"><p class="eyebrow">Collections</p><div class="chips">${collChips}</div></div>
    <div class="f-group"><p class="eyebrow">When <span>${F.from}–${F.to}</span></p><p class="f-hint">Use Time on the map to travel through the years.</p></div>
    <div class="f-actions"><button class="btn primary" id="save-view">Save this view</button><button class="btn" id="reset">Reset</button></div>`;
}

$('filters-body').addEventListener('click', (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  if (t.dataset.kind) F.kinds = toggle(F.kinds, t.dataset.kind);
  else if ('alone' in t.dataset) { F.alone = !F.alone; if (F.alone) F.with = []; }
  else if (t.dataset.with) { F.with = toggle(F.with, t.dataset.with); F.alone = false; }
  else if (t.dataset.by) F.by = t.dataset.by;
  else if (t.dataset.ramp) { setRamp(t.dataset.ramp); renderFilters(); return; }
  else if (t.dataset.set) F.sets = toggle(F.sets, t.dataset.set);
  else if (t.dataset.view) { F = { ...blank(), ...savedViews()[+t.dataset.view].f }; syncTimeline(); apply(); fitAll(); return; }
  else if (t.id === 'reset') { F = blank(); syncTimeline(); }
  else if (t.id === 'save-view') {
    if (!activeCount()) return toast('Choose some filters first.');
    const name = prompt('Name this view', describe(F));
    if (!name) return;
    storeViews([...savedViews(), { name, f: { ...F } }]);
    toast(`Saved “${name}”.`);
  } else return;
  apply();
});

function activeChips() {
  const chips = [];
  const x = '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7 7 17"/></svg>';
  F.kinds.forEach((k) => chips.push([`kind:${k}`, KINDS[k].label]));
  if (F.alone) chips.push(['alone', 'Alone']);
  F.with.forEach((w) => chips.push([`with:${w}`, `With ${personById[w].name}`]));
  if (F.by !== 'any') chips.push(['by', `By ${personById[F.by].name}`]);
  F.sets.forEach((s) => chips.push([`set:${s}`, (tripById[s] || collById[s]).title]));
  if (F.from !== Y0 || F.to !== Y1) chips.push(['time', F.from === F.to ? `${F.from}` : `${F.from}–${F.to}`]);
  $('active-filters').innerHTML = chips.map(([k, l]) => `<button class="af" data-af="${k}">${esc(l)}${x}</button>`).join('');
  const n = activeCount();
  $('filter-count').hidden = !n;
  $('filter-count').textContent = n;
}
$('active-filters').addEventListener('click', (e) => {
  const b = e.target.closest('[data-af]');
  if (!b) return;
  const [k, v] = b.dataset.af.split(':');
  if (k === 'kind') F.kinds = F.kinds.filter((x) => x !== v);
  if (k === 'alone') F.alone = false;
  if (k === 'with') F.with = F.with.filter((x) => x !== v);
  if (k === 'by') F.by = 'any';
  if (k === 'set') F.sets = F.sets.filter((x) => x !== v);
  if (k === 'time') { F.from = Y0; F.to = Y1; syncTimeline(); }
  apply();
});

$('btn-filter').addEventListener('click', () => {
  const open = $('filters').hidden;
  if (open) { closeSheet('memory'); renderFilters(); }
  $('filters').hidden = !open;
  $('btn-filter').setAttribute('aria-expanded', String(open));
});

// ---------- timeline ----------

const from = $('tl-from');
const to = $('tl-to');
for (const r of [from, to]) { r.min = Y0; r.max = Y1; r.step = 1; }
$('timeline').style.setProperty('--n', Y1 - Y0 + 1);
$('tl-years').innerHTML = Array.from({ length: Y1 - Y0 + 1 }, (_, i) => `<span>${(i === 0 || i === Y1 - Y0 || (Y0 + i) % 5 === 0) ? Y0 + i : ''}</span>`).join('');

function syncTimeline() { from.value = F.from; to.value = F.to; }
function bars() {
  const counts = Array.from({ length: Y1 - Y0 + 1 }, () => 0);
  PINS.filter((p) => passes(p, F, { ignoreTime: true })).forEach((p) => counts[year(p) - Y0]++);
  const max = Math.max(1, ...counts);
  $('tl-bars').innerHTML = counts.map((c, i) => `<div class="tl-bar${Y0 + i < F.from || Y0 + i > F.to ? ' out' : ''}" style="height:${(c / max) * 100}%" title="${Y0 + i}: ${c}"></div>`).join('');
  $('tl-range').textContent = F.from === F.to ? `${F.from}` : `${F.from} — ${F.to}`;
}
function onRange(e) {
  let a = +from.value;
  let b = +to.value;
  if (a > b) { if (e.target === from) b = a; else a = b; }
  F.from = a; F.to = b;
  syncTimeline();
  apply({ keepFilters: true });
}
from.addEventListener('input', onRange);
to.addEventListener('input', onRange);
syncTimeline();

$('btn-time').addEventListener('click', () => {
  const on = $('timeline').hidden;
  $('timeline').hidden = !on;
  $('btn-time').setAttribute('aria-pressed', String(on));
  if (!on) { stopPlay(); }
  bars();
  layoutBottom();
});

// Replay: the years unfold one by one, accumulating.
let playing = null;
function stopPlay() {
  clearInterval(playing); playing = null;
  $('btn-play').classList.remove('on');
  $('btn-play').innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10-6.5z"/></svg>';
}
$('btn-play').addEventListener('click', () => {
  if (playing) return stopPlay();
  const start = F.from;
  F.to = start;
  syncTimeline(); apply({ keepFilters: true });
  $('btn-play').classList.add('on');
  $('btn-play').innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 6h3v12H8zM13 6h3v12h-3z"/></svg>';
  playing = setInterval(() => {
    if (F.to >= Y1) return stopPlay();
    F.to += 1;
    syncTimeline(); apply({ keepFilters: true });
  }, 900);
});

// ---------- tools ----------

function fitAll(animate = true) {
  const pins = filtered();
  const pts = (pins.length ? pins : PINS).map((p) => [placeById[p.place].lat, placeById[p.place].lon]);
  const bottom = $('bottom').offsetHeight;
  map.fitBounds(L.latLngBounds(pts), { paddingTopLeft: [40, 150], paddingBottomRight: [40, bottom + 30], animate, maxZoom: 12 });
}
$('btn-fit').addEventListener('click', () => fitAll());

let toastTimer;
function toast(msg) {
  $('toast').textContent = msg;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 2600);
}
$('btn-add').addEventListener('click', () => toast('Quick capture is the next design step.'));

// ---------- apply ----------

function apply({ keepFilters = false } = {}) {
  drawMarkers();
  drawBars();
  tally();
  strip();
  activeChips();
  bars();
  if (!keepFilters && !$('filters').hidden) renderFilters();
}

const countries = initCountries({ PINS, placeById, colourAt: (t) => ramp(rampId)(t), timeT, onOpen: () => { closeSheet('memory'); closeSheet('filters'); } });
document.addEventListener('click', (e) => { if (e.target.closest('#btn-countries')) countries.open(); });

legend();
apply();
layoutBottom();
requestAnimationFrame(() => { fitAll(false); blend(); });
