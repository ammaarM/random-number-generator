// Rasterises the SVG icon sources into the PNG sizes the web manifest needs.
// Run with `npm run icons` after editing public/icons/*.svg.
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const dir = new URL('../public/icons/', import.meta.url);

const targets = [
  { source: 'icon.svg', out: 'icon-192.png', size: 192 },
  { source: 'icon.svg', out: 'icon-512.png', size: 512 },
  { source: 'maskable.svg', out: 'maskable-192.png', size: 192 },
  { source: 'maskable.svg', out: 'maskable-512.png', size: 512 },
  // iOS ignores transparency and applies its own mask, so use the full-bleed art.
  { source: 'maskable.svg', out: 'apple-touch-icon.png', size: 180 },
];

for (const { source, out, size } of targets) {
  const svg = await readFile(new URL(source, dir));
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(new URL(out, dir).pathname);
  console.log(`✓ ${out} (${size}×${size})`);
}
