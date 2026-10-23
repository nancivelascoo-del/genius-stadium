// Draws the doodle "FunZone" sign icon and renders PNGs at every size with Playwright.
// Usage: node tools/make-icons.js   (writes icons/*.png and icons/icon.svg)
const fs = require('fs'); const path = require('path'); const { chromium } = require('@playwright/test');
const root = path.join(__dirname, '..'); const font = fs.readFileSync(path.join(root, 'fonts/permanent-marker.woff2')).toString('base64');
function svg(pad) { // pad: 0 = full art, >0 = shrink sign into the maskable safe zone
  const s = 1 - pad;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<defs><style>@font-face{font-family:M;src:url(data:font/woff2;base64,${font}) format('woff2')}text{font-family:M,'Comic Sans MS',cursive}</style>
<filter id="w" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="5"/></filter>
<pattern id="g" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#9fd3ff" stroke-width="2"/></pattern></defs>
<rect width="512" height="512" fill="#fff8d6"/><rect width="512" height="512" fill="url(#g)" opacity=".7"/>
<g transform="translate(256 262) scale(${s}) translate(-256 -262)">
 <g filter="url(#w)" stroke="#1b1b2f" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">
  <path d="M150 330 L140 470" fill="none"/><path d="M362 330 L374 470" fill="none"/>
  <path d="M70 168 C150 140 350 128 446 150 C462 210 458 290 440 338 C330 362 170 366 72 340 C58 280 58 220 70 168Z" fill="#ff8a1f" transform="rotate(-4 256 250)"/>
  <path d="M96 190 C180 170 330 162 420 178 C430 228 428 280 416 318 C320 336 186 340 98 320 C88 276 88 232 96 190Z" fill="#ffd23f" stroke-width="7" transform="rotate(-4 256 250)"/>
 </g>
 <g transform="rotate(-6 256 250)" stroke="#1b1b2f" stroke-width="10" paint-order="stroke" stroke-linejoin="round">
  <text x="256" y="236" text-anchor="middle" font-size="78" fill="#e63946">Fun</text>
  <text x="256" y="314" text-anchor="middle" font-size="84" fill="#1d7bd8">Zone</text>
 </g>
 <g filter="url(#w)" stroke="#1b1b2f" stroke-width="7" stroke-linejoin="round" stroke-linecap="round">
  <path d="M88 70 l14 30 32 4 -24 22 7 32 -29 -16 -29 16 7 -32 -24 -22 32 -4z" fill="#ffe14d"/>
  <path d="M420 52 l10 21 23 3 -17 16 5 23 -21 -12 -21 12 5 -23 -17 -16 23 -3z" fill="#7ee081"/>
  <path d="M440 408 l6 13 14 2 -10 10 3 14 -13 -7 -13 7 3 -14 -10 -10 14 -2z" fill="#ff6fb5"/>
  <path d="M48 420 q20 -28 40 0 t40 0" fill="none" stroke="#1d7bd8"/>
 </g>
</g></svg>`;
}
(async () => {
  fs.writeFileSync(path.join(root, 'icons/icon.svg'), svg(0)); fs.writeFileSync(path.join(root, 'icons/icon-maskable.svg'), svg(0.18));
  const b = await chromium.launch(); const p = await b.newPage();
  const shot = async (file, size, pad) => {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<html><body style="margin:0">${svg(pad).replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body></html>`);
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(root, 'icons', file), clip: { x: 0, y: 0, width: size, height: size } });
  };
  for (const [f, s, pad] of [['icon-180.png', 180, 0], ['icon-192.png', 192, 0], ['icon-512.png', 512, 0], ['icon-maskable-512.png', 512, 0.18], ['icon-maskable-192.png', 192, 0.18], ['favicon-32.png', 32, 0], ['favicon-64.png', 64, 0]]) await shot(f, s, pad);
  await b.close(); console.log('icons written');
})();
