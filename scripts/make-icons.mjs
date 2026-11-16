// Рисует иконки приложения в public/icons через Playwright (npm run icons).
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

// Playwright не входит в зависимости проекта: берём установленный глобально.
const { chromium } = createRequire(import.meta.url)('playwright');

const star = (cx, cy, r, fill, opacity = 1) => {
  const k = r * 0.12; // «талия» лучей
  return `<path fill="${fill}" fill-opacity="${opacity}" d="M${cx} ${cy - r}
    C${cx + k} ${cy - k} ${cx + k} ${cy - k} ${cx + r} ${cy}
    C${cx + k} ${cy + k} ${cx + k} ${cy + k} ${cx} ${cy + r}
    C${cx - k} ${cy + k} ${cx - k} ${cy + k} ${cx - r} ${cy}
    C${cx - k} ${cy - k} ${cx - k} ${cy - k} ${cx} ${cy - r}Z"/>`;
};

const svg = (scale = 1) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7A5CFF"/>
      <stop offset="1" stop-color="#2F6FD6"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.45" r="0.5">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#g)"/>
  <circle cx="512" cy="470" r="420" fill="url(#glow)"/>
  <g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
    ${star(500, 520, 330, '#ffffff')}
    ${star(770, 260, 110, '#FFE08A')}
    ${star(250, 230, 62, '#ffffff', 0.85)}
    ${star(800, 760, 70, '#ffffff', 0.75)}
  </g>
</svg>`;

const out = new URL('../public/icons/', import.meta.url);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
const shots = [
  ['apple-touch-icon.png', 180, 1],
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  ['icon-maskable-512.png', 512, 0.78],
];
for (const [name, size, scale] of shots) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0"><div style="width:${size}px;height:${size}px">${svg(scale).replace('width="1024" height="1024"', `width="${size}" height="${size}"`)}</div></body></html>`,
  );
  await page.screenshot({ path: new URL(name, out).pathname, omitBackground: false });
  console.log('icon', name);
}
await browser.close();
