// Regenerates the PNG app icons in public/ from the SVGs in assets/.
// Requires Playwright + Chromium to be available (not a project dependency):
//   npx -y playwright@latest install chromium   (once)
//   NODE_PATH=$(npm root -g) node scripts/generate-icons.mjs   (if Playwright is installed globally)
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const targets = [
  { src: 'assets/icon.svg', out: 'public/pwa-192x192.png', size: 192 },
  { src: 'assets/icon.svg', out: 'public/pwa-512x512.png', size: 512 },
  { src: 'assets/icon-maskable.svg', out: 'public/maskable-icon-512x512.png', size: 512 },
  // iOS applies its own rounded mask, so give it the full-bleed square.
  { src: 'assets/icon-maskable.svg', out: 'public/apple-touch-icon.png', size: 180 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const t of targets) {
  const svg = await readFile(t.src, 'utf8');
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${t.size}" height="${t.size}" `)}</body></html>`,
  );
  await writeFile(t.out, await page.screenshot({ omitBackground: true }));
  console.log('wrote', t.out);
}
await browser.close();
await copyFile('assets/icon.svg', 'public/favicon.svg');
