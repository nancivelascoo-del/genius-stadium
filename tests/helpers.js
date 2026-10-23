// Shared helpers for the Genius Stadium QA checks.
const { expect } = require('@playwright/test');
const fs = require('fs'), path = require('path');

function watchErrors(page, { ignore = [] } = {}) {
  const errors = [];
  page.on('pageerror', e => errors.push('uncaught: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !ignore.some(r => r.test(m.text()))) errors.push('console.error: ' + m.text()); });
  page.on('crash', () => errors.push('page crashed'));
  page.on('requestfailed', r => { if (!ignore.some(x => x.test(r.url()))) errors.push('request failed: ' + r.url()); });
  page.on('response', r => { if (r.status() >= 400) errors.push('HTTP ' + r.status() + ': ' + r.url()); });
  return { errors, expectClean: () => expect(errors, 'no console errors, failed loads or uncaught exceptions').toEqual([]) };
}
// Fresh load with the test hook turned on. `state` pre-loads saved progress.
async function open(page, route = '', state) {
  if (state !== undefined) await page.addInitScript(s => { if (!sessionStorage.getItem('gs-seeded')) { localStorage.setItem('genius-stadium-v1', JSON.stringify(s)); sessionStorage.setItem('gs-seeded', '1'); } }, state);
  await page.goto('about:blank');
  await page.goto('./?test' + (route ? '#' + route : ''));
  await page.waitForFunction(() => window.__gs && window.__gs.ready && document.querySelector('#view').children.length);
  await page.waitForTimeout(150);
}
const screen = page => page.evaluate(() => document.body.dataset.screen);
async function go(page, name, params = {}) { await page.evaluate(([n, p]) => window.__gs.go(n, p), [name, params]); await page.waitForTimeout(80); }
const S = page => page.evaluate(() => JSON.parse(JSON.stringify(window.__gs.state())));

// Answer the current multiple-choice question (right or wrong).
async function answer(page, right = true) {
  await page.locator('[data-testid=choice]:not([disabled])').first().waitFor();
  const k = await page.evaluate(() => window.__gs.answer());
  const n = await page.locator('[data-testid=choice]').count();
  const pick = right ? k : (k + 1) % n;
  await page.locator('[data-testid=choice]').nth(pick).click();
  return pick;
}
// Play a whole quiz; for penalty quizzes also take each kick.
async function playQuiz(page, { wrongAt = [], penalty = false } = {}) {
  for (let i = 0; ; i++) {
    if (await page.locator('[data-testid=results]').count()) return;
    const cnt = await page.locator('[data-testid=qcount]').textContent();
    const right = !wrongAt.includes(i);
    await answer(page, right);
    if (penalty) {
      if (right) { await page.locator('[data-testid=zone]').first().click(); }
    } else if (!right) { await page.locator('[data-testid=next]').click(); }
    // Read the DOM in one go: the question counter disappears when results show.
    await expect.poll(() => page.evaluate(c => !!document.querySelector('[data-testid=results]') || (document.querySelector('[data-testid=qcount]') || {}).textContent !== c, cnt), { timeout: 8000 }).toBe(true);
  }
}
// A screen point inside a map shape (or its dot) that really hits that shape.
async function mapPoint(page, id) {
  await page.locator('svg.map').scrollIntoViewIfNeeded();
  return page.evaluate(id => {
    const els = [...document.querySelectorAll(`svg.map [data-id="${id}"]`)].sort((a, b) => (b.tagName === 'circle') - (a.tagName === 'circle'));
    const hits = (x, y) => { const h = document.elementFromPoint(x, y); const t = h && h.closest('[data-id]'); return !!t && t.dataset.id === id; };
    let fallback = null;
    for (const el of els) { const r = el.getBoundingClientRect(); const N = 24;
      for (let i = 1; i < N; i++) for (let j = 1; j < N; j++) {
        const x = Math.round(r.left + r.width * i / N), y = Math.round(r.top + r.height * j / N);
        if (!hits(x, y)) continue; if (!fallback) fallback = { x, y };
        if ([[3, 0], [-3, 0], [0, 3], [0, -3]].every(([dx, dy]) => hits(x + dx, y + dy))) return { x, y }; // well inside, not on a border
      } }
    return fallback;
  }, id);
}
async function tapMap(page, id) { const p = await mapPoint(page, id); expect(p, 'can find ' + id + ' on the map').not.toBeNull(); await page.mouse.click(p.x, p.y); }
// Make a chess move by tapping two squares.
async function move(page, uci) { await page.locator(`[data-sq="${uci.slice(0, 2)}"]`).click(); await page.locator(`[data-sq="${uci.slice(2, 4)}"]`).click(); }
async function solvePuzzle(page) {
  const token = await page.evaluate(() => (window.__gs.board.__tok = Math.random()));
  for (let g = 0; g < 40; g++) {
    if (await page.evaluate(t => !window.__gs.board || window.__gs.board.__tok !== t, token)) return; // a new puzzle started
    const sol = await page.evaluate(() => window.__gs.solution());
    if (!sol) return;
    if (sol === 'wait') { await page.waitForTimeout(150); continue; } // the computer is replying
    if (sol === 'mate') { // any mate finishes: find one with chess.js on the page
      const m = await page.evaluate(() => { const ch = window.__gs.board.chess; for (const mv of ch.moves({ verbose: true })) { ch.move(mv); const ok = ch.isCheckmate(); ch.undo(); if (ok) return mv.from + mv.to; } return null; });
      await move(page, m);
    } else await move(page, sol);
    await page.waitForTimeout(100);
  }
}
// Things that stick out past the right/left edge of the screen.
async function sidewaysOverflow(page) {
  return page.evaluate(() => {
    const W = document.documentElement.clientWidth, bad = [];
    const scroll = document.scrollingElement.scrollWidth - W;
    document.querySelectorAll('#view *').forEach(el => {
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return; }
      if (r.left < -1 || r.right > W + 1) bad.push((el.className && el.className.baseVal !== undefined ? el.tagName : el.className || el.tagName) + ' ' + Math.round(r.left) + '..' + Math.round(r.right));
    });
    return { scroll, bad: bad.slice(0, 10) };
  });
}
async function smallButtons(page) {
  return page.evaluate(() => [...document.querySelectorAll('#view button')].filter(b => { const r = b.getBoundingClientRect(); return r.width && r.height && (r.height < 36 || r.width < 36); }).map(b => (b.dataset.testid || b.textContent.trim()).slice(0, 30) + ' ' + Math.round(b.getBoundingClientRect().width) + 'x' + Math.round(b.getBoundingClientRect().height)));
}
async function shot(page, info, name) {
  const dir = process.env.SHOTS_DIR; if (!dir) return;
  const d = path.join(dir, info.project.name); fs.mkdirSync(d, { recursive: true });
  await page.screenshot({ path: path.join(d, name + '.png') });
}
module.exports = { watchErrors, open, screen, go, S, answer, playQuiz, mapPoint, tapMap, move, solvePuzzle, sidewaysOverflow, smallButtons, shot };
