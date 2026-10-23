// New in release 2: Brainiac FunZone name + doodle home, review screens, difficulty pickers, harder chess, play the computer.
const { test, expect } = require('@playwright/test');
const { watchErrors, open, screen, go, S, answer, playQuiz, tapMap, move, solvePuzzle } = require('./helpers');
const results = page => page.locator('[data-testid=results]');
const items = page => page.locator('[data-testid=review-item]');
const missedItems = page => page.locator('[data-testid=review-item][data-ok="0"]');
async function solveAll(page) { for (let i = 0; i < 60 && !(await results(page).count()); i++) { await solvePuzzle(page); await page.waitForTimeout(250); } }
const vs = page => page.evaluate(() => window.__gs.vs());

// ---------- name, icon, doodle home ----------
test('home: Brainiac FunZone name, doodle tiles, bundled handwriting font', async ({ page }) => {
  const w = watchErrors(page); await open(page);
  await expect(page).toHaveTitle('Brainiac FunZone');
  await expect(page.locator('[data-testid=app-name]')).toHaveText('Brainiac FunZone');
  expect(await page.locator('.tile .doodle').count()).toBe(4);
  expect(await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('20px "Patrick Hand"') && document.fonts.check('20px "Permanent Marker"'); })).toBe(true);
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(255, 251, 232)');
  expect(await page.locator('head link[rel=apple-touch-icon]').getAttribute('href')).toBe('icons/icon-180.png');
  w.expectClean();
});

// ---------- review screens ----------
test('quiz review lists every question; retry missed plays only those', async ({ page }) => {
  const w = watchErrors(page); await open(page); await go(page, 'factquiz', { lvl: 1 });
  await playQuiz(page, { wrongAt: [1, 4] });
  await expect(page.locator('[data-testid=review]')).toBeVisible();
  await expect(items(page)).toHaveCount(10); await expect(missedItems(page)).toHaveCount(2);
  await expect(missedItems(page).first().locator('.mine')).toContainText('Your answer');
  await expect(missedItems(page).first().locator('.right')).toContainText('Correct');
  expect(await page.locator('.rvwhy').count()).toBe(10);
  await page.locator('[data-testid=review-jump]').click();
  await page.locator('[data-testid=retry-missed]').click();
  expect(await screen(page)).toBe('retryquiz'); await expect(page.locator('[data-testid=qcount]')).toHaveText('1/2');
  await playQuiz(page); await expect(results(page)).toBeVisible();
  await expect(page.locator('[data-testid=review] h2')).toContainText('2/2');
  w.expectClean();
});

test('map review: Expert shows no flag, one miss reveals; review map highlights the place; retry', async ({ page }) => {
  const w = watchErrors(page); await open(page); await go(page, 'mapplay', { region: 'usa', n: 10, lvl: 4 });
  const first = await page.evaluate(() => window.__gs.target());
  await tapMap(page, first === 'TX' ? 'CA' : 'TX');
  await expect(page.locator('[data-testid=qcount]')).toHaveText('2/10', { timeout: 4000 });
  for (let i = 1; i < 10; i++) { await tapMap(page, await page.evaluate(() => window.__gs.target())); await page.waitForTimeout(250); }
  await expect(results(page)).toBeVisible();
  await expect(page.locator('[data-testid=review-map] svg.map')).toBeVisible();
  await expect(items(page)).toHaveCount(10); await expect(missedItems(page)).toHaveCount(1);
  await expect(page.locator(`[data-testid=review-map] [data-id="${first}"]`).first()).toHaveClass(/missed/);
  await missedItems(page).locator('[data-testid=show-on-map]').click();
  await expect(page.locator(`[data-testid=review-map] [data-id="${first}"]`).first()).toHaveClass(/reveal/);
  await page.locator('[data-testid=retry-missed]').click();
  expect(await screen(page)).toBe('mapplay'); await expect(page.locator('[data-testid=qcount]')).toHaveText('1/1');
  expect(await page.evaluate(() => window.__gs.target())).toBe(first);
  await go(page, 'mapplay', { region: 'europe', n: 10, lvl: 4 });
  expect(await page.locator('.pflag img').count(), 'Expert: no flag clue').toBe(0);
  w.expectClean();
});

test('Fact or Fib review and retry', async ({ page }) => {
  const w = watchErrors(page); await open(page); await go(page, 'fib', { lvl: 4 });
  await expect(page.locator('[data-testid=clock]')).toHaveText(/^(30|29|28)$/);
  for (let i = 0; i < 3; i++) {
    const f = await page.evaluate(() => window.__gs.answer());
    await page.locator(`[data-testid=btn-${(i === 0 ? !f : f) ? 'fact' : 'fib'}]`).click(); await page.waitForTimeout(i === 0 ? 1800 : 900);
  }
  await page.evaluate(() => window.__gs.timeUp()); await expect(results(page)).toBeVisible();
  await expect(items(page)).toHaveCount(3); await expect(missedItems(page)).toHaveCount(1);
  await page.locator('[data-testid=retry-missed]').click();
  const f = await page.evaluate(() => window.__gs.answer()); await page.locator(`[data-testid=btn-${f ? 'fact' : 'fib'}]`).click();
  await expect(results(page)).toBeVisible({ timeout: 5000 });
  w.expectClean();
});

test('shootout review at Expert', async ({ page }) => {
  const w = watchErrors(page); await open(page); await go(page, 'shootout', { lvl: 4 });
  await playQuiz(page, { wrongAt: [0], penalty: true });
  await expect(items(page)).toHaveCount(5); await expect(missedItems(page)).toHaveCount(1);
  await expect(page.locator('[data-testid=retry-missed]')).toBeVisible();
  w.expectClean();
});

test('daily Hard: picker, review, and a Pro/Master puzzle of the day', async ({ page }) => {
  const w = watchErrors(page); await open(page, 'daily');
  await page.locator('[data-testid=daily-hard]').click();
  await expect(page.locator('[data-testid=diffnote]')).toContainText('Hard');
  await page.locator('[data-testid=daily-play]').click();
  await playQuiz(page, { wrongAt: [0] });
  await expect(items(page)).toHaveCount(5); await expect(missedItems(page)).toHaveCount(1);
  await go(page, 'potd');
  const label = await page.locator('[data-testid=ptheme]').textContent(); expect(label).not.toMatch(/^Mate in 1$/);
  await solvePuzzle(page); await expect(results(page)).toBeVisible({ timeout: 8000 });
  await expect(page.locator('[data-testid=review] .miniboard')).toHaveCount(1);
  await expect(items(page).first()).toContainText('Answer:');
  w.expectClean();
});

test('chess ladder review shows the answer with a mini board; retry missed puzzles', async ({ page }) => {
  const w = watchErrors(page); await open(page); await go(page, 'ladder');
  await page.locator('[data-testid=show]').click();
  await expect(page.locator('[data-testid=qcount]')).toHaveText('2/5', { timeout: 10000 });
  await solveAll(page);
  await expect(results(page)).toBeVisible({ timeout: 8000 });
  await expect(items(page)).toHaveCount(5); await expect(missedItems(page)).toHaveCount(1);
  await expect(missedItems(page).locator('.miniboard')).toHaveCount(1);
  await expect(missedItems(page)).toContainText(/Answer: .*[a-h][1-8]/);
  await page.locator('[data-testid=retry-missed]').click();
  expect(await screen(page)).toBe('pzretry'); await expect(page.locator('[data-testid=qcount]')).toHaveText('1/1');
  w.expectClean();
});

// ---------- difficulty pickers ----------
test('difficulty pickers: Easy to Expert in Geo, Facts and Soccer; Expert is faster', async ({ page }) => {
  const w = watchErrors(page);
  for (const r of ['geo', 'facts', 'soccer']) {
    await open(page, r);
    for (const l of [4, 3, 2, 1, 4]) { await page.locator(`[data-testid=lvl-${l}]`).click(); await expect(page.locator(`[data-testid=lvl-${l}]`)).toHaveClass(/on/); }
    await expect(page.locator('[data-testid=diffnote]')).toContainText('Expert');
  }
  const timerMs = () => page.evaluate(() => document.querySelector('.timer i').style.transition);
  await go(page, 'flagquiz', { lvl: 4 }); expect(await timerMs()).toContain('6000ms');
  await go(page, 'flagquiz', { lvl: 1 }); expect(await timerMs()).toContain('12000ms');
  await go(page, 'capquiz', { lvl: 4, usa: true }); expect(await timerMs()).toContain('7000ms');
  await go(page, 'factquiz', { lvl: 4 }); expect(await timerMs()).toContain('7000ms');
  await go(page, 'soctrivia', { lvl: 4 }); expect(await timerMs()).toContain('8000ms');
  w.expectClean();
});

test('Expert content: rare flags, hard facts, expert soccer questions', async ({ page }) => {
  const w = watchErrors(page); await open(page);
  const pools = await page.evaluate(async () => { const c = await import('./js/content.js'); return { f: c.FACTS.filter(x => x.t === 3).map(x => x.q), s: c.SOCCER.filter(x => x.t === 4).map(x => x.q) }; });
  expect(pools.f.length).toBeGreaterThanOrEqual(20); expect(pools.s.length).toBeGreaterThanOrEqual(15);
  await go(page, 'factquiz', { lvl: 4 });
  const q = await page.locator('[data-testid=question]').textContent(); expect(pools.f.some(x => q.includes(x))).toBe(true);
  await go(page, 'soctrivia', { lvl: 4 }); await answer(page, true);
  w.expectClean();
});

// ---------- harder chess ----------
test('chess: five tiers, Pro lessons, Puzzle Blitz hard start and 5 minutes', async ({ page }) => {
  const w = watchErrors(page); await open(page, 'chess');
  await expect(page.locator('[data-testid^=tier-]')).toHaveCount(5);
  expect(await page.locator('.lesson.pro').count()).toBe(5);
  await page.locator('[data-testid=tier-5]').click(); expect(await screen(page)).toBe('chess'); // locked: stays, shows a toast
  await go(page, 'sprint', { mins: 5, start: 'hard' });
  expect(await page.evaluate(() => window.__gs.sprintPuzzle.d)).toBeGreaterThanOrEqual(3);
  await expect(page.locator('[data-testid=clock]')).toHaveText(/^4:5\d|^5:00/);
  await expect(page.locator('[data-testid=lives]')).toHaveText('⬜⬜⬜');
  await go(page, 'sprint', { mins: 3 }); expect(await page.evaluate(() => window.__gs.sprintPuzzle.d)).toBe(1);
  w.expectClean();
});

test('skip-ahead test: solving everything unlocks tier 5', async ({ page }) => {
  test.setTimeout(90000);
  const w = watchErrors(page); await open(page); await go(page, 'placement');
  await solveAll(page);
  await expect(results(page)).toBeVisible({ timeout: 8000 });
  const s = await S(page); expect(s.tier).toBe(5);
  await expect(items(page)).toHaveCount(7);
  await open(page, 'chess'); await expect(page.locator('[data-testid=tier-5]')).not.toHaveClass(/locked/);
  w.expectClean();
});

// ---------- play the computer ----------
test('vs computer: pick screen, Stockfish engine, play black (engine moves first), resume after reload', async ({ page }) => {
  test.setTimeout(90000);
  const w = watchErrors(page); await open(page); await go(page, 'vs');
  await expect(page.locator('[data-testid=opp]')).toHaveCount(6);
  await page.locator('[data-testid=color-b]').click(); await page.locator('[data-testid=opp]').nth(2).click();
  expect(await screen(page)).toBe('vsgame');
  await expect.poll(async () => (await vs(page)).moves.length, { timeout: 30000 }).toBe(1);
  const v = await vs(page); expect(v.color).toBe('b'); expect(v.turn).toBe('b'); expect(v.engine).toBe('stockfish');
  const legal = await page.evaluate(() => { const m = window.__gs.board.chess.moves({ verbose: true })[0]; return m.from + m.to; });
  await move(page, legal);
  await expect.poll(async () => (await vs(page)).moves.length, { timeout: 30000 }).toBe(3);
  await open(page); await go(page, 'vs'); await page.locator('[data-testid=vs-resume]').click();
  expect((await vs(page)).moves.length).toBe(3);
  w.expectClean();
});

test('vs computer: undo and hint on easy levels; resign takes two taps and counts a loss', async ({ page }) => {
  test.setTimeout(60000);
  const w = watchErrors(page); await open(page); await go(page, 'vsgame', { opp: 'chick', color: 'w' });
  await page.locator('[data-testid=vhint]').click(); await expect(page.locator('.sq.hint')).not.toHaveCount(0);
  await move(page, 'e2e4');
  await expect.poll(async () => (await vs(page)).moves.length, { timeout: 30000 }).toBe(2);
  await page.locator('[data-testid=undo]').click();
  expect((await vs(page)).moves.length).toBe(0);
  await page.locator('[data-testid=resign]').click(); expect((await vs(page)).over).toBe(false);
  await page.locator('[data-testid=resign]').click();
  await expect.poll(async () => (await vs(page)).result).toBe('loss');
  expect((await S(page)).vs.chick.l).toBe(1);
  await go(page, 'vsgame', { opp: 'bolt', color: 'w' });
  expect(await page.locator('[data-testid=undo]').count()).toBe(0); expect(await page.locator('[data-testid=vhint]').count()).toBe(0);
  w.expectClean();
});

test('vs computer: checkmate wins, stalemate and bare kings draw', async ({ page }) => {
  const w = watchErrors(page); await open(page);
  for (const [fen, mv, want] of [['6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', 'd1d8', 'win'], ['k7/8/8/1Q6/8/8/8/7K w - - 0 1', 'b5b6', 'draw'], ['k7/8/8/8/8/8/1p6/K7 w - - 0 1', 'a1b2', 'draw']]) {
    await go(page, 'vsgame', { opp: 'turtle', color: 'w', fen }); await move(page, mv);
    await expect.poll(async () => (await vs(page)).result).toBe(want);
  }
  const s = await S(page); expect(s.vs.turtle.w).toBe(1); expect(s.vs.turtle.d).toBe(2);
  w.expectClean();
});

// ---------- Chess.com-inspired extras ----------
// page.route can't see requests made under a service worker, so these tests run without one (the API is mocked; CI never calls Chess.com).
test.describe('Chess.com', () => {
test.use({ serviceWorkers: 'block' });
test('Puzzle Blitz: 3 strikes and you are out', async ({ page }) => {
  test.setTimeout(60000);
  const w = watchErrors(page); await open(page); await go(page, 'sprint', { mins: 3 });
  for (let i = 0; i < 3; i++) {
    const sol = await page.evaluate(() => window.__gs.solution());
    const bad = await page.evaluate(s => { const ch = window.__gs.board.chess; for (const m of ch.moves({ verbose: true })) { if (m.from + m.to === s.slice(0, 4) || m.promotion) continue; ch.move(m); const mate = ch.isCheckmate(); ch.undo(); if (!mate) return m.from + m.to; } }, sol);
    await page.evaluate(() => { window.__gs.board.__old = 1; });
    await move(page, bad);
    if (i === 2) break; // the 3rd strike ends the round
    await expect(page.locator('[data-testid=lives]')).toHaveText('❌'.repeat(i + 1) + '⬜'.repeat(2 - i), { timeout: 12000 });
    await page.waitForFunction(() => window.__gs.board && !window.__gs.board.__old, null, { timeout: 12000 });
  }
  await expect(results(page)).toBeVisible({ timeout: 15000 });
  await expect(missedItems(page)).toHaveCount(3);
  w.expectClean();
});

test('Rated Puzzles: rating starts at 800, goes up on a solve and down on a miss', async ({ page }) => {
  const w = watchErrors(page); await open(page, 'chess');
  await expect(page.locator('[data-testid=prating]')).toContainText('800');
  await go(page, 'rated');
  await solvePuzzle(page);
  await expect.poll(async () => (await S(page)).prating).toBeGreaterThan(800);
  const up = (await S(page)).prating;
  await expect(page.locator('[data-testid=qcount]')).toHaveText('2/10', { timeout: 6000 });
  const sol = await page.evaluate(() => window.__gs.solution());
  const bad = await page.evaluate(s => { const ch = window.__gs.board.chess; for (const m of ch.moves({ verbose: true })) { if (m.from + m.to === s.slice(0, 4) || m.promotion) continue; ch.move(m); const mate = ch.isCheckmate(); ch.undo(); if (!mate) return m.from + m.to; } }, sol);
  await move(page, bad);
  await expect.poll(async () => (await S(page)).prating, { timeout: 6000 }).toBeLessThan(up);
  expect((await S(page)).pcount).toBe(2);
  w.expectClean();
});

test('bots show ratings 400 to 2000; a rating-limited bot (UCI_Elo) still moves', async ({ page }) => {
  test.setTimeout(60000);
  const w = watchErrors(page); await open(page); await go(page, 'vs');
  expect(await page.locator('[data-testid=opp-rating]').allTextContents()).toEqual(['400', '700', '1000', '1350', '1700', '2000']);
  await go(page, 'vsgame', { opp: 'owl', color: 'b' });
  await expect.poll(async () => (await vs(page)).moves.length, { timeout: 30000 }).toBe(1);
  w.expectClean();
});

const CC = { title: 'Test <b>Puzzle</b>', url: 'https://www.chess.com/daily/2026-10-23', publish_time: 1792738800, fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', pgn: '[FEN "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1"]\n\n1. Rd8# *' };
test('Chess.com Daily Puzzle: online shows it with credit; offline or blocked falls back to our puzzle', async ({ page, context }) => {
  const w = watchErrors(page, { ignore: [/Failed to load resource/i, /ERR_FAILED/i, /api\.chess\.com/] });
  let hits = 0;
  await page.route('https://api.chess.com/pub/puzzle', r => { hits++; r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(CC) }); });
  await open(page, 'chess'); await page.locator('[data-testid=go-ccdaily]').click();
  await expect(page.locator('[data-testid=ccsource]')).toHaveAttribute('data-src', 'chesscom');
  await expect(page.locator('[data-testid=ccsource]')).toContainText('Test <b>Puzzle</b>'); // shown as text, not HTML
  await expect(page.locator('[data-testid=cccredit] a')).toHaveAttribute('href', CC.url);
  await expect(page.locator('[data-testid=cccredit]')).toContainText('Puzzle from Chess.com');
  await move(page, 'd1d8'); await expect(results(page)).toBeVisible({ timeout: 6000 });
  await go(page, 'ccdaily'); await expect(page.locator('[data-testid=ccsource]')).toHaveAttribute('data-src', 'chesscom');
  expect(hits, 'fetched once a day, then kept on the device').toBe(1);
  // blocked (no CORS / server down) -> our own puzzle
  await page.evaluate(() => { const s = window.__gs.state(); delete s.ccPuzzle; });
  await page.unroute('https://api.chess.com/pub/puzzle'); await page.route('https://api.chess.com/**', r => r.abort());
  await go(page, 'ccdaily'); await expect(page.locator('[data-testid=ccsource]')).toHaveAttribute('data-src', 'own');
  await expect(page.locator('[data-testid=cccredit]')).toHaveText('');
  await context.setOffline(true);
  await go(page, 'ccdaily'); await expect(page.locator('[data-testid=ccsource]')).toContainText("You're offline");
  await context.setOffline(false);
  w.expectClean();
});

test('Chess.com ratings: off by default, nothing sent until turned on and tapped', async ({ page }) => {
  const w = watchErrors(page, { ignore: [/Failed to load resource/i, /api\.chess\.com/] }); const calls = [];
  await page.route('https://api.chess.com/**', r => { calls.push(r.request().url()); const nf = /nobody/.test(r.request().url());
    r.fulfill({ status: nf ? 404 : 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(nf ? { code: 0 } : { chess_rapid: { last: { rating: 912 }, best: { rating: 950 } }, chess_blitz: { last: { rating: 805 } }, tactics: { highest: { rating: 1400 } }, puzzle_rush: { best: { score: 21 } } }) }); });
  await open(page, 'chess'); await page.locator('[data-testid=go-ccstats]').click();
  await expect(page.locator('[data-testid=cc-toggle]')).toContainText('Off');
  expect(await page.locator('[data-testid=cc-user]').count()).toBe(0);
  await page.locator('[data-testid=cc-toggle]').click();
  await expect(page.locator('[data-testid=cc-user]')).toHaveValue('');
  await page.locator('[data-testid=cc-user]').fill('bad name!'); await page.locator('[data-testid=cc-show]').click();
  await expect(page.locator('[data-testid=cc-out]')).toContainText('letters'); expect(calls).toEqual([]);
  await page.locator('[data-testid=cc-user]').fill('Some_Kid'); await page.locator('[data-testid=cc-show]').click();
  await expect(page.locator('[data-testid=cc-tile]')).toHaveCount(4);
  await expect(page.locator('[data-testid=cc-out]')).toContainText('912');
  expect(calls).toEqual(['https://api.chess.com/pub/player/some_kid/stats']);
  await page.locator('[data-testid=cc-user]').fill('nobody'); await page.locator('[data-testid=cc-show]').click();
  await expect(page.locator('[data-testid=cc-out]')).toContainText('No Chess.com player');
  w.expectClean();
});
});
