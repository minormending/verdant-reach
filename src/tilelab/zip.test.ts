import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { decodePng, encodePng } from "../art/png";
import { adler32, crc32, dosDateTime, unzipStore, zipStore, zlibStore } from "./zip";

const bytes = (s: string) => new TextEncoder().encode(s);

describe("crc32 and adler32", () => {
  it("match the standard check values", () => {
    expect(crc32(bytes("123456789"))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array(0))).toBe(0);
    expect(crc32(bytes("The quick brown fox jumps over the lazy dog"))).toBe(0x414fa339);
    expect(adler32(bytes("Wikipedia"))).toBe(0x11e60398);
  });
  it("can be computed incrementally", () => {
    expect(crc32(bytes("6789"), crc32(bytes("12345")))).toBe(0xcbf43926);
  });
});

describe("zlibStore", () => {
  it("is a valid zlib stream for empty, small and multi-block input", () => {
    for (const n of [0, 1, 1000, 65535, 65536, 200_000]) {
      const data = new Uint8Array(n).map((_, i) => (i * 31) & 0xff);
      expect(new Uint8Array(inflateSync(zlibStore(data)))).toEqual(data);
    }
  });
  it("works as the PNG encoder's deflate", () => {
    const img = { width: 3, height: 2, data: new Uint8Array(24).map((_, i) => i * 10) };
    expect(decodePng(encodePng(img, zlibStore), inflateSync)).toEqual(img);
  });
});

describe("zipStore", () => {
  const files = [
    { name: "README.md", data: bytes("# hello\n") },
    { name: "pack/tilesets/terrain/tileset.json", data: bytes('{"a":1}\n') },
    { name: "tiles/ünï.png", data: new Uint8Array(70_000).map((_, i) => i & 0xff) },
    { name: "empty.txt", data: new Uint8Array(0) },
  ];
  const date = new Date(2026, 9, 12, 13, 45, 30);
  const zip = zipStore(files, date);

  it("round-trips every entry with its CRC", () => {
    const back = unzipStore(zip);
    expect([...back.keys()]).toEqual(files.map((f) => f.name));
    for (const f of files) expect(back.get(f.name)).toEqual(f.data);
  });

  it("writes the standard records", () => {
    const dv = new DataView(zip.buffer);
    expect(dv.getUint32(0, true)).toBe(0x04034b50);
    const eocd = zip.length - 22;
    expect(dv.getUint32(eocd, true)).toBe(0x06054b50);
    expect(dv.getUint16(eocd + 10, true)).toBe(files.length);
    // Stored entries: total size is headers plus the raw bytes.
    const names = files.reduce((n, f) => n + bytes(f.name).length, 0);
    const data = files.reduce((n, f) => n + f.data.length, 0);
    expect(zip.length).toBe(files.length * (30 + 46) + 2 * names + data + 22);
    expect(dv.getUint16(10, true)).toBe(dosDateTime(date).time);
    expect(dv.getUint16(12, true)).toBe(dosDateTime(date).date);
  });

  it("encodes DOS dates", () => {
    expect(dosDateTime(date)).toEqual({ time: (13 << 11) | (45 << 5) | 15, date: (46 << 9) | (10 << 5) | 12 });
  });

  it("rejects duplicate and empty names", () => {
    expect(() => zipStore([{ name: "a", data: new Uint8Array(0) }, { name: "a", data: new Uint8Array(0) }])).toThrow(/duplicate/);
    expect(() => zipStore([{ name: "", data: new Uint8Array(0) }])).toThrow();
  });

  it("detects corruption", () => {
    const bad = zip.slice();
    bad[30 + bytes("README.md").length] ^= 0xff;
    expect(() => unzipStore(bad)).toThrow(/CRC/);
  });
});
