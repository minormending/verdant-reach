// A tiny PNG decoder/encoder with zero dependencies. The (de)compressor is
// injected, so this file has no Node or DOM imports: Node passes
// `zlib.inflateSync` / `zlib.deflateSync` (the bundle test and tools); the
// browser never needs it (canvas decodes PNGs).
//
// Decodes colour types 0 (grey), 2 (RGB), 3 (indexed), 4 (grey+alpha) and
// 6 (RGBA) at bit depth 8, plus 1/2/4-bit grey and indexed, with tRNS. Not
// supported: 16-bit samples and Adam7 interlacing (they throw).

export interface Rgba {
  width: number;
  height: number;
  /** width*height*4 bytes, RGBA, row-major. */
  data: Uint8Array;
}

export type Inflate = (data: Uint8Array) => Uint8Array;
export type Deflate = (data: Uint8Array) => Uint8Array;

const SIG = [137, 80, 78, 71, 13, 10, 26, 10];

function u32(b: Uint8Array, o: number): number {
  return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
}

function checkSig(b: Uint8Array) {
  if (b.length < 33 || SIG.some((v, i) => b[i] !== v)) throw new Error("not a PNG file");
}

/** Width and height from the IHDR chunk, without decoding. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } {
  checkSig(bytes);
  return { width: u32(bytes, 16), height: u32(bytes, 20) };
}

export function decodePng(bytes: Uint8Array, inflate: Inflate): Rgba {
  checkSig(bytes);
  let o = 8;
  let width = 0, height = 0, depth = 0, ctype = 0, interlace = 0;
  let palette: Uint8Array | null = null;
  let trns: Uint8Array | null = null;
  const idat: Uint8Array[] = [];
  while (o + 8 <= bytes.length) {
    const len = u32(bytes, o);
    const type = String.fromCharCode(bytes[o + 4], bytes[o + 5], bytes[o + 6], bytes[o + 7]);
    const body = bytes.subarray(o + 8, o + 8 + len);
    o += 12 + len;
    if (type === "IHDR") {
      width = u32(body, 0);
      height = u32(body, 4);
      depth = body[8];
      ctype = body[9];
      interlace = body[12];
    } else if (type === "PLTE") palette = body;
    else if (type === "tRNS") trns = body;
    else if (type === "IDAT") idat.push(body);
    else if (type === "IEND") break;
  }
  if (!width || !height) throw new Error("PNG has no IHDR");
  if (interlace) throw new Error("interlaced PNGs are not supported");
  if (depth === 16) throw new Error("16-bit PNGs are not supported");
  const channels = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as Record<number, number>)[ctype];
  if (!channels) throw new Error(`unsupported PNG colour type ${ctype}`);
  if (depth !== 8 && !(depth < 8 && (ctype === 0 || ctype === 3))) throw new Error(`unsupported bit depth ${depth} for colour type ${ctype}`);
  if (ctype === 3 && !palette) throw new Error("indexed PNG without PLTE");

  let total = 0;
  for (const c of idat) total += c.length;
  const z = new Uint8Array(total);
  let p = 0;
  for (const c of idat) { z.set(c, p); p += c.length; }
  const raw = inflate(z);

  const bitsPP = channels * depth;
  const stride = Math.ceil((width * bitsPP) / 8);
  const bpp = Math.max(1, bitsPP >> 3); // bytes per pixel for filtering
  const pix = new Uint8Array(stride * height);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const ft = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = pix.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      switch (ft) {
        case 0: break;
        case 1: v += a; break;
        case 2: v += b; break;
        case 3: v += (a + b) >> 1; break;
        case 4: {
          const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
          v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          break;
        }
        default: throw new Error(`bad PNG filter ${ft}`);
      }
      cur[x] = v & 255;
    }
    prev = cur;
  }

  const out = new Uint8Array(width * height * 4);
  const sample = (row: Uint8Array, i: number): number => {
    if (depth === 8) return row[i];
    const bit = i * depth;
    return (row[bit >> 3] >> (8 - depth - (bit & 7))) & ((1 << depth) - 1);
  };
  const greyScale = depth < 8 ? 255 / ((1 << depth) - 1) : 1;
  const tGrey = trns && ctype === 0 && trns.length >= 2 ? (trns[0] << 8) | trns[1] : -1;
  const tRgb = trns && ctype === 2 && trns.length >= 6 ? [(trns[0] << 8) | trns[1], (trns[2] << 8) | trns[3], (trns[4] << 8) | trns[5]] : null;
  for (let y = 0; y < height; y++) {
    const row = pix.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < width; x++) {
      const q = (y * width + x) * 4;
      if (ctype === 6) {
        out[q] = row[x * 4]; out[q + 1] = row[x * 4 + 1]; out[q + 2] = row[x * 4 + 2]; out[q + 3] = row[x * 4 + 3];
      } else if (ctype === 2) {
        const r = row[x * 3], g = row[x * 3 + 1], b = row[x * 3 + 2];
        out[q] = r; out[q + 1] = g; out[q + 2] = b;
        out[q + 3] = tRgb && tRgb[0] === r && tRgb[1] === g && tRgb[2] === b ? 0 : 255;
      } else if (ctype === 3) {
        const i = sample(row, x);
        out[q] = palette![i * 3]; out[q + 1] = palette![i * 3 + 1]; out[q + 2] = palette![i * 3 + 2];
        out[q + 3] = trns && i < trns.length ? trns[i] : 255;
      } else if (ctype === 0) {
        const s = sample(row, x);
        const v = Math.round(s * greyScale);
        out[q] = out[q + 1] = out[q + 2] = v;
        out[q + 3] = s === tGrey ? 0 : 255;
      } else {
        out[q] = out[q + 1] = out[q + 2] = row[x * 2];
        out[q + 3] = row[x * 2 + 1];
      }
    }
  }
  return { width, height, data: out };
}

// ---------------------------------------------------------------------------
// Encoder (RGBA, colour type 6, filter 0): fixtures, tools and tests.
// ---------------------------------------------------------------------------

let crcTable: Uint32Array | null = null;
function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, body: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + body.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, body.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(body, 8);
  dv.setUint32(8 + body.length, crc32(out.subarray(4, 8 + body.length)));
  return out;
}

export function encodePng(img: Rgba, deflate: Deflate): Uint8Array {
  const { width, height, data } = img;
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr[8] = 8; ihdr[9] = 6;
  const raw = new Uint8Array(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) raw.set(data.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  const parts = [new Uint8Array(SIG), chunk("IHDR", ihdr), chunk("IDAT", deflate(raw)), chunk("IEND", new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
