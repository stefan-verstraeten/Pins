// Small geometry helpers shared by the main map and the countries map.

// Rings that cross the antimeridian jump from 180 to -180; unwrap them so Leaflet
// doesn't draw a band across the whole world.
// (Antarctica's rings circle the pole — an odd number of jumps — and are fine as they are.)
export function unwrap(ring) {
  const jumps = ring.filter((p, i) => i && Math.abs(p[0] - ring[i - 1][0]) > 180).length;
  if (!jumps || jumps % 2) return ring;
  let prev = ring[0][0];
  const out = ring.map((pt) => {
    let lon = pt[0];
    while (lon - prev > 180) lon -= 360;
    while (lon - prev < -180) lon += 360;
    prev = lon;
    return [lon, pt[1]];
  });
  // Keep the bulk of the ring on the main world (Eurasia's ring may start in Chukotka).
  const mid = out.map((p) => p[0]).sort((a, b) => a - b)[out.length >> 1];
  const shift = mid < -180 ? 360 : mid > 180 ? -360 : 0;
  return shift ? out.map(([lon, lat]) => [lon + shift, lat]) : out;
}

export function unwrapGeo(geo) {
  for (const f of geo.features || [geo]) {
    const g = f.geometry || f;
    if (!g) continue;
    if (g.type === 'Polygon') g.coordinates = g.coordinates.map(unwrap);
    if (g.type === 'MultiPolygon') g.coordinates = g.coordinates.map((poly) => poly.map(unwrap));
  }
  return geo;
}

// Distance in km, good enough at the scale of "nearby".
export function km(a, b) {
  const x = (b.lon - a.lon) * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180);
  const y = b.lat - a.lat;
  return Math.sqrt(x * x + y * y) * 111.2;
}
