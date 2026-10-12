// A minimal, dependency-free ZIP writer (store only, no compression) and a
// stored-block zlib stream, so the Tile Lab can hand back an art pack as one
// download and encode PNGs without a compressor. Pure: no DOM, no Node.
//
// ZIP layout (PKWARE APPNOTE 4.3): for each file a local header + its bytes,
// then the central directory and the end-of-central-directory record. Names
// are UTF-8 (general purpose bit 11). No ZIP64: the lab's packs are tiny.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** CRC-32 (IEEE 802.3, as used by ZIP and PNG). */
export function crc32(bytes: Uint8Array, crc = 0): number {
  let c = (crc ^ 0xffffffff) >>> 0;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Adler-32 (the zlib checksum). */
export function adler32(bytes: Uint8Array): number {
  let a = 1, b = 0;
  for (let i = 0; i < bytes.length; i++) {
    a = (a + bytes[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

/**
 * A zlib stream (RFC 1950) holding `data` in stored (uncompressed) deflate
 * blocks. Valid input for any inflater, so it works as the `Deflate` that
 * src/art/png.ts `encodePng` takes.
 */
export function zlibStore(data: Uint8Array): Uint8Array {
  const MAX = 65535;
  const blocks = Math.max(1, Math.ceil(data.length / MAX));
  const out = new Uint8Array(2 + blocks * 5 + data.length + 4);
  out[0] = 0x78; out[1] = 0x01; // deflate, 32K window, no dictionary, fastest; (0x7801 % 31 === 0)
  let o = 2;
  for (let b = 0; b < blocks; b++) {
    const start = b * MAX;
    const len = Math.min(MAX, data.length - start);
    out[o++] = b === blocks - 1 ? 1 : 0; // BFINAL, BTYPE=00 (stored)
    out[o++] = len & 0xff; out[o++] = len >>> 8;
    out[o++] = ~len & 0xff; out[o++] = (~len >>> 8) & 0xff;
    out.set(data.subarray(start, start + len), o);
    o += len;
  }
  const ad = adler32(data);
  out[o++] = ad >>> 24; out[o++] = (ad >>> 16) & 0xff; out[o++] = (ad >>> 8) & 0xff; out[o++] = ad & 0xff;
  return out;
}

export interface ZipEntry {
  /** Path inside the archive, with forward slashes ("pack/pack.json"). */
  name: string;
  data: Uint8Array;
}

/** MS-DOS date and time fields for a Date (local time, 2-second resolution). */
export function dosDateTime(d: Date): { time: number; date: number } {
  const year = Math.min(Math.max(d.getFullYear(), 1980), 2107);
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

const utf8 = (s: string) => new TextEncoder().encode(s);

/** Build a store-only ZIP archive. `date` stamps every entry (default: now). */
export function zipStore(entries: readonly ZipEntry[], date: Date = new Date()): Uint8Array {
  const { time, date: day } = dosDateTime(date);
  const seen = new Set<string>();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = e.name.replace(/\\/g, "/").replace(/^\/+/, "");
    if (!name || seen.has(name)) throw new Error(`zip: bad or duplicate entry name "${e.name}"`);
    seen.add(name);
    const nb = utf8(name);
    const crc = crc32(e.data);
    const size = e.data.length;
    const local = new Uint8Array(30 + nb.length + size);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);       // version needed: 2.0
    lv.setUint16(6, 0x0800, true);   // UTF-8 names
    lv.setUint16(8, 0, true);        // method: stored
    lv.setUint16(10, time, true);
    lv.setUint16(12, day, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nb.length, true);
    lv.setUint16(28, 0, true);
    local.set(nb, 30);
    local.set(e.data, 30 + nb.length);
    locals.push(local);

    const central = new Uint8Array(46 + nb.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);       // made by: 2.0 (MS-DOS attributes)
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, day, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nb.length, true);
    // extra, comment, disk number, internal and external attributes: 0
    cv.setUint32(42, offset, true);
    central.set(nb, 46);
    centrals.push(central);
    offset += local.length;
  }
  const cdSize = centrals.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  const out = new Uint8Array(offset + cdSize + end.length);
  let o = 0;
  for (const part of [...locals, ...centrals, end]) { out.set(part, o); o += part.length; }
  return out;
}

/** Read back a store-only archive (what `zipStore` writes): name -> bytes. Checks every CRC. */
export function unzipStore(zip: Uint8Array): Map<string, Uint8Array> {
  const dv = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let eocd = -1;
  for (let i = zip.length - 22; i >= 0; i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("zip: no end of central directory");
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const out = new Map<string, Uint8Array>();
  const dec = new TextDecoder();
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error("zip: bad central directory entry");
    if (dv.getUint16(p + 10, true) !== 0) throw new Error("zip: only stored entries are supported");
    const crc = dv.getUint32(p + 16, true);
    const size = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extra = dv.getUint16(p + 30, true);
    const comment = dv.getUint16(p + 32, true);
    const at = dv.getUint32(p + 42, true);
    const name = dec.decode(zip.subarray(p + 46, p + 46 + nameLen));
    if (dv.getUint32(at, true) !== 0x04034b50) throw new Error(`zip: bad local header for ${name}`);
    const start = at + 30 + dv.getUint16(at + 26, true) + dv.getUint16(at + 28, true);
    const data = zip.slice(start, start + size);
    if (crc32(data) !== crc) throw new Error(`zip: CRC mismatch for ${name}`);
    out.set(name, data);
    p += 46 + nameLen + extra + comment;
  }
  return out;
}
