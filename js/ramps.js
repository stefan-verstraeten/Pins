// Colour ramps for time: oldest memory → newest. Each is a few hand-picked stops from the
// Pins palette family, interpolated in OKLab so the blend stays even and never turns muddy.

export const RAMPS = {
  tide: { name: 'Tide', note: 'Sea to olive to ochre, ending in rust', stops: ['#557F86', '#7D9478', '#B5934F', '#A65A3C'] },
  dusk: { name: 'Dusk', note: 'Slate blue through heather to terracotta and gold', stops: ['#62809F', '#937D9E', '#C27B69', '#D2A157'] },
  verdigris: { name: 'Verdigris', note: 'Deep teal brightening to straw', stops: ['#2E5D5E', '#5A8A7D', '#9CAE7A', '#D4B862'] },
  embers: { name: 'Embers', note: 'Straw deepening to oxblood', stops: ['#D7B66C', '#C98A4D', '#A4513C', '#6C2D37'] },
  sepia: { name: 'Sepia', note: 'Faded sand darkening to ink', stops: ['#CDB991', '#A58B68', '#75654D', '#3B3832'] },
};
export const DEFAULT_RAMP = 'tide';

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function toLab([r, g, b]) {
  [r, g, b] = [r, g, b].map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function fromLab([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return rgb.map((c) => Math.round(Math.min(1, Math.max(0, gam(c))) * 255));
}

const cache = {};
// Returns t ∈ [0,1] → [r,g,b]; sampled into a 256-step table for speed.
export function ramp(id) {
  if (cache[id]) return cache[id];
  const labs = (RAMPS[id] || RAMPS[DEFAULT_RAMP]).stops.map((s) => toLab(hex(s)));
  const table = Array.from({ length: 256 }, (_, i) => {
    const x = (i / 255) * (labs.length - 1);
    const k = Math.min(labs.length - 2, Math.floor(x));
    const f = x - k;
    return fromLab(labs[k].map((v, j) => v + (labs[k + 1][j] - v) * f));
  });
  const fn = (t) => table[Math.round(Math.min(1, Math.max(0, t)) * 255)];
  fn.css = (n = 8) => `linear-gradient(90deg, ${Array.from({ length: n }, (_, i) => `rgb(${fn(i / (n - 1)).join(',')})`).join(', ')})`;
  return (cache[id] = fn);
}
