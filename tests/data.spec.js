// Content checks (run once): every file the app needs exists, every chess puzzle is legal and correct, quiz data is clean.
const { test, expect } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
test.beforeEach(() => { test.skip(test.info().project.name !== 'chromium-ipad-landscape', 'data checks run once'); });

test('every precached file loads from the server', async ({ request }) => {
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const files = JSON.parse(sw.match(/const FILES = (\[.*\]);/)[1].replace(/'/g, '"'));
  for (const f of files) expect((await request.get(f)).status(), f).toBe(200);
});

// The app's own modules are loaded in the browser (they are browser ES modules).
async function load(page) { await page.goto('./?test'); await page.waitForFunction(() => window.__gs && window.__gs.ready); }

test('chess puzzles: every line is legal and does what it says', async ({ page }) => {
  await load(page);
  const r = await page.evaluate(async () => {
    const { Chess } = await import('./js/chess.js'); const { LESSONS, POOL } = await import('./js/puzzles.js');
    const all = [...LESSONS.flatMap(l => l.puzzles), ...POOL]; const bad = []; const ids = new Set();
    for (const p of all) {
      if (ids.has(p.id)) bad.push('duplicate ' + p.id); ids.add(p.id);
      const ch = new Chess(p.fen);
      try { for (const m of p.line) ch.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] }); } catch (e) { bad.push(p.id + ' illegal line'); continue; }
      if (p.mate && !ch.isCheckmate()) bad.push(p.id + ' should end in mate');
      if (!p.mate && ch.isGameOver()) bad.push(p.id + ' ends the game unexpectedly');
    }
    return { n: all.length, bad };
  });
  expect(r.n).toBeGreaterThan(110); expect(r.bad).toEqual([]);
});

test('geo data: every country has a flag file, every map target has a name, capitals filled in', async ({ page }) => {
  await load(page);
  const GEO = await page.evaluate(async () => { const m = await import('./data/geo.js'); return { countries: m.GEO.countries, states: m.GEO.states, regions: Object.fromEntries(Object.entries(m.GEO.regions).map(([k, r]) => [k, { shapes: r.shapes.map(s => ({ id: s.id, t: s.t })) }])) }; });
  for (const [cc, c] of Object.entries(GEO.countries)) {
    expect(fs.existsSync(path.join(ROOT, 'flags', cc.toLowerCase() + '.svg')), 'flag for ' + cc).toBe(true);
    expect(c.n.length).toBeGreaterThan(2); if (c.cap !== null) expect(c.cap.length).toBeGreaterThan(2);
  }
  for (const [k, r] of Object.entries(GEO.regions)) for (const s of r.shapes.filter(s => s.t)) expect(k === 'usa' ? GEO.states[s.id] : GEO.countries[s.id], k + ' ' + s.id).toBeTruthy();
  expect(Object.keys(GEO.states).length).toBe(50);
  expect(GEO.countries.AU.cap).toBe('Canberra'); expect(GEO.countries.CA.cap).toBe('Ottawa'); expect(GEO.states.NY.cap).toBe('Albany');
});

test('quiz content: answers are not repeated in the wrong choices and nothing is duplicated', async ({ page }) => {
  await load(page);
  const { SOCCER, FACTS, FIBS } = await page.evaluate(async () => { const m = await import('./js/content.js'); return { SOCCER: m.SOCCER, FACTS: m.FACTS, FIBS: m.FIBS }; });
  for (const q of [...SOCCER, ...FACTS]) {
    expect(q.w.length, q.q).toBe(3);
    expect(new Set([q.a, ...q.w]).size, q.q + ' has 4 different choices').toBe(4);
    expect(q.why && q.why.length > 5, q.q + ' has a why line').toBe(true);
  }
  for (const f of FIBS) { expect(typeof f.f).toBe('boolean'); expect(f.why.length).toBeGreaterThan(5); }
  const qs = [...SOCCER, ...FACTS].map(q => q.q); expect(new Set(qs).size).toBe(qs.length);
  expect(FIBS.filter(f => f.f).length).toBeGreaterThan(10); expect(FIBS.filter(f => !f.f).length).toBeGreaterThan(10);
});
