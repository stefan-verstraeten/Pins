import json, sys
src, out = sys.argv[1], sys.argv[2]
KEEP = {  # Natural Earth GEOUNIT -> name shown in Pins
  'England': 'England', 'Scotland': 'Scotland', 'Wales': 'Wales', 'Northern Ireland': 'Northern Ireland',
  'France': 'France', 'French Guiana': 'French Guiana', 'Guadeloupe': 'Guadeloupe', 'Martinique': 'Martinique',
  'Reunion': 'Réunion', 'Mayotte': 'Mayotte',
  'Norway': 'Norway', 'Svalbard': 'Svalbard', 'Jan Mayen': 'Jan Mayen',
  'Netherlands': 'Netherlands', 'Caribbean Netherlands': 'Caribbean Netherlands',
}
def ring(r):
  o = []
  for x, y in r:
    p = [round(x, 3), round(y, 3)]
    if not o or o[-1] != p: o.append(p)
  return o
feats = []
for f in json.load(open(src))['features']:
  g = f['properties']['GEOUNIT']
  if g not in KEEP: continue
  geo = f['geometry']
  if geo['type'] == 'Polygon': geo['coordinates'] = [ring(r) for r in geo['coordinates']]
  else: geo['coordinates'] = [[ring(r) for r in p] for p in geo['coordinates']]
  feats.append({'type': 'Feature', 'properties': {'name': KEEP[g], 'sovereign': f['properties']['SOVEREIGNT']}, 'geometry': geo})
assert len(feats) == len(KEEP), sorted(set(KEEP) - {f['properties']['name'] for f in feats})
json.dump({'type': 'FeatureCollection', 'features': feats}, open(out, 'w'), ensure_ascii=False, separators=(',', ':'))
