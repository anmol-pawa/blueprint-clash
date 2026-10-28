// Generates the original pixel-art app icons (a framed blueprint sheet with a
// drafting rectangle, a set-square corner and a gold pin) with no
// dependencies: public/icon-{192,512}.png, app/icon.png, app/apple-icon.png.
// Run: node scripts/gen-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const PAL = { ".": [8, 14, 32], b: [18, 52, 110], l: [56, 120, 200], w: [200, 232, 255], y: [250, 204, 70], o: [14, 15, 26] };
const GRID = [
  "oooooooooooooooo",
  "obbbbbbbbbbbbbbo",
  "oblbblbblbblbbbo",
  "obbbbbbbbbbbbbbo",
  "obbwwwwwwwbbbbbo",
  "obbwbbbbbwbbyybo",
  "obbwbbbbbwbbyybo",
  "obbwbbbbbwbbbbbo",
  "obbwwwwwwwbbbbbo",
  "oblbblbblbblbbbo",
  "obbbbbbbbbbbbbbo",
  "obwbbbbbbbbbbbbo",
  "obwwbbbbbbwwwwbo",
  "obwbwbbbbbbbbbbo",
  "obbbbbbbbbbbbbbo",
  "oooooooooooooooo",
];

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, c]);
};
function png(size) {
  const scale = size / 16;
  const stride = size * 3 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      raw.set(PAL[GRID[Math.floor(y / scale)][Math.floor(x / scale)]], y * stride + 1 + x * 3);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
writeFileSync("public/icon-192.png", png(192));
writeFileSync("public/icon-512.png", png(512));
writeFileSync("app/icon.png", png(64));
writeFileSync("app/apple-icon.png", png(180));
console.log("icons written");
