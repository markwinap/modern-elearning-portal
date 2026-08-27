import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(data) {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  }
  return Buffer.from([(c ^ 0xffffffff) >>> 24, (c ^ 0xffffffff) >>> 16, (c ^ 0xffffffff) >>> 8, (c ^ 0xffffffff) >>> 0]);
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  return Buffer.concat([length, typeBuf, data, crc]);
}

function rgbaFromHex(hex) {
  const clean = hex.replace("#", "");
  return [
    Number.parseInt(clean.substring(0, 2), 16),
    Number.parseInt(clean.substring(2, 4), 16),
    Number.parseInt(clean.substring(4, 6), 16),
    255,
  ];
}

function generateSolidPng(width, height, colorHex) {
  const [r, g, b, a] = rgbaFromHex(colorHex);
  const rowSize = 1 + width * 4;
  const image = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowStart = y * rowSize;
    image[rowStart] = 0; // filter byte: none
    for (let x = 0; x < width; x++) {
      const offset = rowStart + 1 + x * 4;
      image[offset] = r;
      image[offset + 1] = g;
      image[offset + 2] = b;
      image[offset + 3] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace

  const idat = deflateSync(image, { level: 9 });

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = `${__dirname}/../public/icons`;
mkdirSync(outDir, { recursive: true });

const primaryColor = "#1677ff";

const sizes = [
  { name: "icon-192x192.png", size: 192 },
  { name: "icon-512x512.png", size: 512 },
  { name: "icon-maskable-192x192.png", size: 192 },
  { name: "icon-maskable-512x512.png", size: 512 },
];

for (const { name, size } of sizes) {
  const png = generateSolidPng(size, size, primaryColor);
  writeFileSync(`${outDir}/${name}`, png);
  console.log(`Generated ${outDir}/${name} (${size}x${size})`);
}
