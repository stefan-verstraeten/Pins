// Place names from coordinates and coordinates from names, via OpenStreetMap's Nominatim.
// Its policy asks for no type-ahead and at most one request a second: we search only when
// asked, and look up an address only after the map has stopped moving.

const BASE = 'https://nominatim.openstreetmap.org';
const UK = new Set(['England', 'Scotland', 'Wales', 'Northern Ireland']);

let last = 0;
async function get(path, params) {
  const wait = last + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const r = await fetch(`${BASE}${path}?${new URLSearchParams({ format: 'jsonv2', addressdetails: '1', 'accept-language': 'en', ...params })}`);
  if (!r.ok) throw new Error(`Place lookup failed (${r.status}).`);
  return r.json();
}

// Nominatim result → the fields a Pins place has.
function shape(x) {
  const a = x.address || {};
  // The UK's four nations count as countries in Pins.
  const country = a.country_code === 'gb' && UK.has(a.state) ? a.state : a.country || '';
  const city = a.city || a.town || a.village || a.hamlet || a.municipality || a.suburb || a.county || a.state || '';
  const name = x.name || a.tourism || a.amenity || a.leisure || a.historic || a.road || city;
  return { name, city, country, lat: +(+x.lat).toFixed(5), lon: +(+x.lon).toFixed(5), label: x.display_name };
}

export async function search(q) {
  const res = await get('/search', { q, limit: '6' });
  return res.map(shape);
}

export async function reverse(lat, lon) {
  const res = await get('/reverse', { lat: String(lat), lon: String(lon), zoom: '18' });
  return res && !res.error ? shape(res) : null;
}
