// Offline: the service worker caches everything on the first visit, then the whole game works with no internet.
const { test, expect } = require('@playwright/test');
const { watchErrors, open, screen, go, answer, tapMap, move } = require('./helpers');
const OFF = [/Failed to load resource/i, /ERR_INTERNET_DISCONNECTED/i];

test('works offline after the first visit', async ({ page, context }) => {
  const w = watchErrors(page, { ignore: OFF });
  await open(page);
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toMatch(/\/genius-stadium\/$/);
  await expect.poll(() => page.evaluate(async () => { const reg = await navigator.serviceWorker.ready; return reg.active && reg.active.state; })).toBe('activated');
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { message: 'service worker controls the page' }).toBe(true);
  await expect.poll(() => page.evaluate(async () => { const k = await caches.keys(); const c = await caches.open(k.find(x => x.startsWith('fz-'))); return (await c.keys()).length; })).toBeGreaterThan(160);
  const cached = await page.evaluate(async () => { const k = await caches.keys(); const c = await caches.open(k.find(x => x.startsWith('fz-'))); return (await c.keys()).map(r => new URL(r.url).pathname); });
  for (const f of ['/genius-stadium/', '/genius-stadium/index.html', '/genius-stadium/js/app.js', '/genius-stadium/js/chess.js', '/genius-stadium/data/geo.js', '/genius-stadium/flags/br.svg', '/genius-stadium/icons/icon-512.png', '/genius-stadium/icons/icon-maskable-512.png', '/genius-stadium/fonts/patrick-hand.woff2', '/genius-stadium/fonts/permanent-marker.woff2', '/genius-stadium/engine/stockfish-18-lite-single.js', '/genius-stadium/engine/stockfish-18-lite-single.wasm'])
    expect(cached, 'offline cache has ' + f).toContain(f);

  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => window.__gs && window.__gs.ready);
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller), 'page came from the offline copy').toBe(true);
  for (const b of ['go-geo', 'go-chess', 'go-soccer', 'go-facts', 'go-daily', 'go-trophies']) { await page.locator(`[data-testid=${b}]`).click(); await page.locator('[data-testid=back]').click(); }
  await go(page, 'flagquiz', { lvl: 3 });
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll('#view img')].every(i => i.complete && i.naturalWidth > 0))).toBe(true);
  await answer(page, true);
  await go(page, 'mapplay', { region: 'africa', n: 10 });
  await tapMap(page, await page.evaluate(() => window.__gs.target()));
  await expect(page.locator('[data-testid=qcount]')).toHaveText('2/10');
  await go(page, 'lesson', { id: 'backrank' }); await move(page, 'd1d8');
  await expect(page.locator('[data-testid=pmsg]')).toContainText('Solved');
  // the chess computer (Stockfish in a web worker) still thinks with no internet
  await go(page, 'vsgame', { opp: 'fox', color: 'b' });
  await expect.poll(() => page.evaluate(() => window.__gs.vs().moves.length), { timeout: 30000 }).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__gs.vs().engine)).toBe('stockfish');
  const p2 = await context.newPage(); const w2 = watchErrors(p2, { ignore: OFF });
  await p2.goto('./#chess'); await p2.waitForFunction(() => document.body.dataset.screen === 'chess');
  await context.setOffline(false);
  w.expectClean(); w2.expectClean();
});

test('makes no requests to other websites', async ({ page }) => {
  const outside = [];
  page.on('request', r => { const u = new URL(r.url()); if (!['127.0.0.1', 'localhost'].includes(u.hostname) && !/^(data|blob):/.test(r.url())) outside.push(r.url()); });
  await open(page);
  for (const r of ['geo', 'chess', 'soccer', 'facts', 'daily', 'trophies']) await open(page, r);
  await go(page, 'flagquiz', { lvl: 1 }); await go(page, 'explore', { region: 'world' }); await go(page, 'shootout', { lvl: 1 });
  await page.waitForTimeout(500);
  expect(outside).toEqual([]);
});

test('installable: manifest and icons load', async ({ page, request }) => {
  await open(page);
  const href = await page.locator('link[rel=manifest]').getAttribute('href');
  const m = await (await request.get(href)).json();
  expect(m.name).toBe('Brainiac FunZone'); expect(m.short_name).toBe('FunZone'); expect(m.display).toBe('standalone');
  for (const i of m.icons) expect((await request.get(i.src)).status()).toBe(200);
  expect((await request.get('icons/icon-180.png')).status()).toBe(200);
});
