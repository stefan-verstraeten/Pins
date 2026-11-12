// Country names. Map shapes carry Natural Earth's short names ("Bosnia and Herz."); these
// give the names we show, and the other names people type ("Holland", "Burma", "UK").

export const DISPLAY = {
  'United States of America': 'United States', Vatican: 'Vatican City', Macao: 'Macau',
  'Antigua and Barb.': 'Antigua and Barbuda', 'Bosnia and Herz.': 'Bosnia and Herzegovina',
  Macedonia: 'North Macedonia', 'Dominican Rep.': 'Dominican Republic', 'Central African Rep.': 'Central African Republic',
  'Dem. Rep. Congo': 'DR Congo', Congo: 'Republic of the Congo', 'Eq. Guinea': 'Equatorial Guinea',
  'S. Sudan': 'South Sudan', 'W. Sahara': 'Western Sahara', eSwatini: 'Eswatini', 'N. Cyprus': 'Northern Cyprus',
  'Marshall Is.': 'Marshall Islands', 'Solomon Is.': 'Solomon Islands', 'Cook Is.': 'Cook Islands',
  'N. Mariana Is.': 'Northern Mariana Islands', 'U.S. Virgin Is.': 'U.S. Virgin Islands', 'British Virgin Is.': 'British Virgin Islands',
  'Cayman Is.': 'Cayman Islands', 'Turks and Caicos Is.': 'Turks and Caicos Islands', 'Falkland Is.': 'Falkland Islands',
  'Pitcairn Is.': 'Pitcairn Islands', 'Faeroe Is.': 'Faroe Islands', 'Wallis and Futuna Is.': 'Wallis and Futuna',
  'St. Vin. and Gren.': 'Saint Vincent and the Grenadines', 'St. Kitts and Nevis': 'Saint Kitts and Nevis',
  'St. Pierre and Miquelon': 'Saint Pierre and Miquelon', 'St-Martin': 'Saint Martin', 'St-Barthélemy': 'Saint Barthélemy',
  'Fr. Polynesia': 'French Polynesia', 'Fr. S. Antarctic Lands': 'French Southern Lands', 'S. Geo. and the Is.': 'South Georgia',
  'Br. Indian Ocean Ter.': 'British Indian Ocean Territory', 'Indian Ocean Ter.': 'Christmas and Cocos Islands',
  'Heard I. and McDonald Is.': 'Heard and McDonald Islands', 'Ashmore and Cartier Is.': 'Ashmore and Cartier Islands',
};

const UK = ['uk', 'united kingdom', 'great britain', 'britain'];
export const OTHER_NAMES = {
  'United States of America': ['usa', 'us', 'america', 'united states of america'],
  Vatican: ['holy see', 'vatican'], Czechia: ['czech republic'], Netherlands: ['holland'],
  England: UK, Scotland: UK, Wales: UK, 'Northern Ireland': UK,
  eSwatini: ['swaziland'], "Côte d'Ivoire": ['ivory coast'], Myanmar: ['burma'], 'Timor-Leste': ['east timor'],
  'Cabo Verde': ['cape verde'], Turkey: ['türkiye'], Russia: ['russian federation'], Laos: ['lao'],
  'South Korea': ['korea', 'republic of korea'], 'North Korea': ['korea', 'dprk'], China: ['prc'],
  'Dem. Rep. Congo': ['democratic republic of the congo', 'drc', 'congo kinshasa'], Congo: ['congo brazzaville'],
  'Bosnia and Herz.': ['bosnia', 'herzegovina'], Macedonia: ['macedonia'], Palestine: ['west bank', 'gaza'],
  'United Arab Emirates': ['uae', 'emirates'], 'Faeroe Is.': ['faeroe islands'], 'Falkland Is.': ['malvinas'],
  'S. Geo. and the Is.': ['south sandwich islands'],
};

export const shown = (name) => DISPLAY[name] || name;
export const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[.'’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Search index over the map's own names: every name a country goes by, normalised.
export function nameIndex(names) {
  return names.map((name) => ({ name, terms: [...new Set([name, shown(name), ...(OTHER_NAMES[name] || [])].map(norm))] }));
}

// Best matches for what was typed: whole name first, then a name starting with it,
// then any word starting with it.
export function search(index, q, n = 6) {
  const k = norm(q);
  if (!k) return [];
  const scored = [];
  for (const e of index) {
    let best = 9;
    for (const t of e.terms) {
      if (t === k) best = Math.min(best, 0);
      else if (t.startsWith(k)) best = Math.min(best, 1);
      else if (t.split(' ').some((w) => w.startsWith(k)) || (k.length > 2 && t.includes(k))) best = Math.min(best, 2);
    }
    if (best < 9) scored.push({ name: e.name, best });
  }
  return scored.sort((a, b) => a.best - b.best || shown(a.name).localeCompare(shown(b.name))).slice(0, n).map((s) => s.name);
}

// A country name as written on a place ("Czech Republic", "Vatican City") → the map's name.
const REVERSE = (() => {
  const seen = {};
  const add = (term, name) => { (seen[norm(term)] ||= new Set()).add(name); };
  for (const [name, d] of Object.entries(DISPLAY)) add(d, name);
  for (const [name, others] of Object.entries(OTHER_NAMES)) for (const o of others) add(o, name);
  const out = {};
  for (const [k, s] of Object.entries(seen)) if (s.size === 1) out[k] = [...s][0];
  return out;
})();
export const resolveName = (raw) => REVERSE[norm(raw)] || raw;
