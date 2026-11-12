// Photos coming in: when and where they were taken (from EXIF), and the two sizes Pins keeps:
// a master of 3,200 px on the long side, and a 640 px thumbnail for pins and cards.

// Reads DateTimeOriginal and GPS from a JPEG's EXIF block. Returns {} when there is none
// (HEIC straight from a Mac, screenshots, photos whose location was removed when shared).
export async function readExif(file) {
  try {
    const buf = await file.slice(0, 256 * 1024).arrayBuffer();
    const v = new DataView(buf);
    if (v.getUint16(0) !== 0xffd8) return {};
    let o = 2;
    while (o + 4 < v.byteLength) {
      const marker = v.getUint16(o);
      const len = v.getUint16(o + 2);
      if (marker === 0xffe1 && v.getUint32(o + 4) === 0x45786966) return tiff(v, o + 10);
      if ((marker & 0xff00) !== 0xff00) break;
      o += 2 + len;
    }
  } catch { /* unreadable: no metadata */ }
  return {};
}

function tiff(v, start) {
  const le = v.getUint16(start) === 0x4949;
  const u16 = (p) => v.getUint16(start + p, le);
  const u32 = (p) => v.getUint32(start + p, le);
  const ifd = (p) => {
    const out = {};
    const n = u16(p);
    for (let i = 0; i < n; i++) {
      const e = p + 2 + i * 12;
      out[u16(e)] = { type: u16(e + 2), count: u32(e + 4), at: e + 8 };
    }
    return out;
  };
  const ascii = (t) => {
    const p = t.count > 4 ? u32(t.at) : t.at;
    let s = '';
    for (let i = 0; i < t.count - 1; i++) s += String.fromCharCode(v.getUint8(start + p + i));
    return s;
  };
  const rationals = (t) => {
    const p = u32(t.at);
    return Array.from({ length: t.count }, (_, i) => u32(p + i * 8) / (u32(p + i * 8 + 4) || 1));
  };
  const out = {};
  const ifd0 = ifd(u32(4));
  if (ifd0[0x8769]) {
    const ex = ifd(u32(ifd0[0x8769].at));
    const dt = ex[0x9003] || ex[0x9004] || ifd0[0x0132];
    if (dt) {
      const m = ascii(dt).match(/^(\d{4}):(\d{2}):(\d{2})/);
      if (m && m[1] !== '0000') out.date = `${m[1]}-${m[2]}-${m[3]}`;
    }
  }
  if (ifd0[0x8825]) {
    const g = ifd(u32(ifd0[0x8825].at));
    if (g[2] && g[4]) {
      const dms = (t) => { const [d, m, s] = rationals(t); return d + m / 60 + s / 3600; };
      const ref = (t) => String.fromCharCode(v.getUint8(start + t.at));
      let lat = dms(g[2]); let lon = dms(g[4]);
      if (g[1] && ref(g[1]) === 'S') lat = -lat;
      if (g[3] && ref(g[3]) === 'W') lon = -lon;
      if (Number.isFinite(lat) && Number.isFinite(lon) && (lat || lon)) out.lat = +lat.toFixed(6), out.lon = +lon.toFixed(6);
    }
  }
  return out;
}

async function decode(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode(); // the browser applies the EXIF orientation
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function scaled(img, max, quality) {
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k);
  c.height = Math.round(img.naturalHeight * k);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the photo.'))), 'image/jpeg', quality));
}

// → { master, thumb, width, height, date?, lat?, lon? }
export async function prepare(file) {
  const [exif, img] = await Promise.all([readExif(file), decode(file)]);
  const master = await scaled(img, 3200, 0.86);
  const thumb = await scaled(img, 640, 0.8);
  return { master, thumb, width: img.naturalWidth, height: img.naturalHeight, ...exif };
}
