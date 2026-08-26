import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const root = process.cwd();
const source = path.join(root, "src", "assets", "cookie.svg");
const publicDir = path.join(root, "public");
const iconsDir = path.join(publicDir, "icons");
const appDir = path.join(root, "src", "app");

function createIco(images: { size: number; data: Buffer }[]) {
  const headerSize = 6;
  const entrySize = 16;
  const header = Buffer.alloc(headerSize + entrySize * images.length);

  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let imageOffset = header.length;

  images.forEach(({ size, data }, index) => {
    const offset = headerSize + entrySize * index;
    header.writeUInt8(size === 256 ? 0 : size, offset);
    header.writeUInt8(size === 256 ? 0 : size, offset + 1);
    header.writeUInt8(0, offset + 2);
    header.writeUInt8(0, offset + 3);
    header.writeUInt16LE(1, offset + 4);
    header.writeUInt16LE(32, offset + 6);
    header.writeUInt32LE(data.length, offset + 8);
    header.writeUInt32LE(imageOffset, offset + 12);
    imageOffset += data.length;
  });

  return Buffer.concat([header, ...images.map(({ data }) => data)]);
}

async function generateIcons() {
  await mkdir(iconsDir, { recursive: true });

  const svg = await readFile(source);

  await Promise.all([
    sharp(svg).resize(192, 192).png().toFile(path.join(iconsDir, "icon-192.png")),
    sharp(svg).resize(512, 512).png().toFile(path.join(iconsDir, "icon-512.png")),
    sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: "#FFF7E8",
      },
    })
      .composite([
        {
          input: await sharp(svg).resize(410, 410).png().toBuffer(),
          gravity: "centre",
        },
      ])
      .png()
      .toFile(path.join(iconsDir, "icon-512-maskable.png")),
    sharp(svg).resize(180, 180).png().toFile(path.join(publicDir, "apple-touch-icon.png")),
  ]);

  const faviconImages = await Promise.all(
    [16, 32, 48].map(async (size) => ({
      size,
      data: await sharp(svg).resize(size, size).png().toBuffer(),
    })),
  );
  const favicon = createIco(faviconImages);

  await Promise.all([
    writeFile(path.join(publicDir, "favicon.ico"), favicon),
    copyFile(source, path.join(appDir, "icon.svg")),
  ]);
}

generateIcons().catch((error: unknown) => {
  console.error("No se pudieron generar los iconos de Choki.", error);
  process.exitCode = 1;
});
