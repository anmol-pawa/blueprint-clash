// Generates the original PWA icons (blueprint tile with a pixel "B") using only node:zlib.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const B = ["1111110", "1000001", "1000001", "1111110", "1000001", "1000001", "1111110"];

function crc32(buf) {
  let c, crc = ~0;
  for (const byte of buf) {
    c = (crc ^ byte) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return ~crc >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const cell = Math.floor(size / 11);
  const off = Math.floor((size - cell * 7) / 2);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const gx = Math.floor((x - off) / cell), gy = Math.floor((y - off) / cell);
      const glyph = gx >= 0 && gx < 7 && gy >= 0 && gy < 7 && B[gy][gx] === "1";
      const grid = x % Math.floor(size / 8) === 0 || y % Math.floor(size / 8) === 0;
      const [r, g, b] = glyph ? [251, 191, 36] : grid ? [30, 58, 110] : [10, 21, 48];
      const i = y * (size * 4 + 1) + 1 + x * 4;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; raw[i + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
for (const [name, size] of [["public/icon-192.png", 192], ["public/icon-512.png", 512], ["app/icon.png", 256], ["app/apple-icon.png", 180]]) writeFileSync(name, png(size));
