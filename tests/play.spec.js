// Gameplay: quizzes, map taps, chess moves (legal, illegal, wrong, right), shootout, blitz, daily, progress.
const { test, expect } = require('@playwright/test');
const { watchErrors, open, screen, go, S, answer, playQuiz, tapMap, move, solvePuzzle } = require('./helpers');

test('flag quiz: right answers score with speed points, finishing gives XP, a best and a badge', async ({ page }) => {
  const w = watchErrors(page);
  await open(page, 'geo');
  await page.locator('[data-testid=flags]').click();
  await answer(page, true);
  await expect.poll(async () => +(await page.locator('[data-testid=score]').textContent()).replace(/\D/g, '')).toBeGreaterThan(500);
  await playQuiz(page, { wrongAt: [3] });
  await expect(page.locator('[data-testid=results]')).toBeVisible();
  const s = await S(page);
  expect(s.xp).toBeGreaterThan(0); expect(s.bests.flags_1.score).toBeGreaterThan(0); expect(s.badges.first).toBeTruthy(); expect(s.stats.flagsRight).toBe(9);
  expect(s.streak.count).toBe(1);
  expect(Object.values(s.missed).flat().length, 'the missed flag goes in the rematch list').toBe(1);
  await page.locator('[data-testid=again]').click(); expect(await screen(page)).toBe('flagquiz');
  w.expectClean();
});

test('wrong answer shows the right one, a why line, and a Next button', async ({ page }) => {
  const w = watchErrors(page);
  await open(page); await go(page, 'capquiz', { lvl: 2 });
  const pick = await answer(page, false);
  await expect(page.locator('[data-testid=choice]').nth(pick)).toHaveClass(/wrong/);
  await expect(page.locator('[data-testid=choice].right')).toHaveCount(1);
  await expect(page.locator('[data-testid=why]')).toContainText('capital');
  await page.locator('[data-testid=next]').click();
  await expect(page.locator('[data-testid=qcount]')).toHaveText('2/10');
  w.expectClean();
});

test('USA state capitals and Pro capitals play to the end', async ({ page }) => {
  const w = watchErrors(page);
  await open(page); await go(page, 'capquiz', { lvl: 3, usa: true });
  await playQuiz(page);
  expect((await S(page)).bests.caps_usa_3.acc).toBe(100);
  w.expectClean();
});

test('map: tapping the right country turns it green; wrong taps name what you hit; 3 misses reveal it', async ({ page }) => {
  const w = watchErrors(page);
  await open(page); await go(page, 'mapplay', { region: 'europe', n: 10 });
  const first = await page.evaluate(() => window.__gs.target());
  await tapMap(page, first);
  await expect(page.locator(`svg.map [data-id="${first}"]`).first()).toHaveClass(/done/);
  await expect(page.locator('[data-testid=qcount]')).toHaveText('2/10');
  const second = await page.evaluate(() => window.__gs.target());
  const wrong = second === 'FR' ? 'DE' : 'FR';
  await tapMap(page, wrong);
  await expect(page.locator('.toast').last()).toContainText("That's");
  await tapMap(page, wrong); await tapMap(page, wrong);
  await expect(page.locator(`svg.map [data-id="${second}"]`).first()).toHaveClass(/reveal|missed/);
  await expect(page.locator('[data-testid=qcount]')).toHaveText('3/10', { timeout: 4000 });
  for (let i = 2; i < 10; i++) { const t = await page.evaluate(() => window.__gs.target()); await tapMap(page, t); await page.waitForTimeout(250); }
  await expect(page.locator('[data-testid=results]')).toBeVisible();
  const s = await S(page); expect(s.stats.map_europe).toBe(1); expect(s.missed.geo).toContain(second);
  w.expectClean();
});

test('map: every target in every region can be found and tapped', async ({ page }) => {
  test.skip(!test.info().project.name.endsWith('ipad-landscape'), 'one size is enough for this sweep');
  test.setTimeout(240000);
  await open(page);
  for (const region of ['world', 'europe', 'africa', 'asia', 'namerica', 'samerica', 'oceania', 'usa']) {
    await go(page, 'explore', { region });
    const ids = await page.evaluate(() => [...new Set([...document.querySelectorAll('svg.map .c.t')].map(p => p.dataset.id))]);
    for (const id of ids) { await tapMap(page, id); await expect(page.locator('[data-testid=info] h3')).not.toHaveText(/Unknown/); }
  }
});

test('map zoom buttons and USA sprint', async ({ page }) => {
  const w = watchErrors(page);
  await open(page); await go(page, 'mapplay', { region: 'usa', n: 10 });
  const vb0 = await page.locator('svg.map').getAttribute('viewBox');
  await page.locator('.zoombtns [data-z=in]').click();
  expect(await page.locator('svg.map').getAttribute('viewBox')).not.toBe(vb0);
  await page.locator('.zoombtns [data-z=out]').click(); await page.locator('.zoombtns [data-z=reset]').click();
  expect(await page.locator('svg.map').getAttribute('viewBox')).toBe(vb0);
  for (let i = 0; i < 30 && !(await page.locator('[data-testid=results]').count()); i++) {
    const t = await page.evaluate(() => window.__gs.target()); await tapMap(page, t);
    await page.waitForFunction(t0 => document.querySelector('[data-testid=results]') || window.__gs.target() !== t0, t, { timeout: 3000 }).catch(() => {});
  }
  await expect(page.locator('[data-testid=results]')).toBeVisible();
  expect((await S(page)).bests.map_usa_10.time).toBeGreaterThan(0);
  w.expectClean();
});

test('explore: tapping a country shows its flag and capital', async ({ page }) => {
  const w = watchErrors(page);
  await open(page); await go(page, 'explore', { region: 'samerica' });
  await tapMap(page, 'BR');
  await expect(page.locator('[data-testid=info]')).toContainText('Brazil');
  await expect(page.locator('[data-testid=info]')).toContainText('Brasília');
  await expect.poll(() => page.locator('[data-testid=info] img').evaluate(i => i.naturalWidth)).toBeGreaterThan(0);
  w.expectClean();
});

test('chess: illegal moves are ignored, wrong moves bounce back, the right move solves it', async ({ page }) => {
  const w = watchErrors(page);
  await open(page); await go(page, 'lesson', { id: 'backrank' });
  const fen0 = await page.evaluate(() => window.__gs.board.chess.fen());
  // illegal: rook d1 cannot jump to h8
  await move(page, 'd1h8');
  expect(await page.evaluate(() => window.__gs.board.chess.fen())).toBe(fen0);
  // legal but wrong
  await move(page, 'd1d4');
  await expect(page.locator('[data-testid=pmsg]')).toContainText('Try again');
  await expect.poll(() => page.evaluate(() => window.__gs.board.chess.fen())).toBe(fen0);
  // right
  await move(page, 'd1d8');
  await expect(page.locator('[data-testid=pmsg]')).toContainText('Solved');
  await expect(page.locator('[data-testid=qcount]')).toHaveText('2/3', { timeout: 4000 });
  // selecting a piece shows its legal squares
  await page.locator('[data-sq=d8]').click();
  expect(await page.locator('.sq.tgt, .sq.cap').count()).toBeGreaterThan(0);
  w.expectClean();
});

test('chess: hint highlights a square and Show me plays the answer', async ({ page }) => {
  const w = watchErrors(page);
  await open(page); await go(page, 'lesson', { id: 'fork' });
  await page.locator('[data-testid=hint]').click();
  await expect(page.locator('.sq.hint')).toHaveCount(1);
  await page.locator('[data-testid=show]').click();
  await expect(page.locator('[data-testid=qcount]')).toHaveText('2/3', { timeout: 8000 });
  w.expectClean();
});

test('chess: every lesson can be completed', async ({ page }) => {
  test.setTimeout(180000);
  const w = watchErrors(page);
  await open(page);
  for (const id of ['backrank', 'mates', 'fork', 'pin', 'skewer', 'discover']) {
    await go(page, 'lesson', { id });
    for (let i = 0; i < 6 && !(await page.locator('[data-testid=results]').count()); i++) { await solvePuzzle(page); await page.waitForTimeout(1000); }
    await expect(page.locator('[data-testid=results]')).toBeVisible();
  }
  const s = await S(page); expect(s.stats.lessonsDone).toBe(6); expect(s.badges.lessons).toBeTruthy();
  w.expectClean();
});

test('chess ladder: 5 first-try solves fast-track to Tier 2; Puzzle Blitz ends with a score', async ({ page }) => {
  test.setTimeout(150000);
  const w = watchErrors(page);
  await open(page, 'chess');
  await page.locator('[data-testid=ladder]').click();
  for (let i = 0; i < 8 && !(await page.locator('[data-testid=results]').count()); i++) { await solvePuzzle(page); await page.waitForTimeout(1000); }
  await expect(page.locator('[data-testid=results]')).toBeVisible();
  expect((await S(page)).ladder).toBeGreaterThanOrEqual(5);
  await expect(page.locator('[data-testid=results]')).toContainText('Fast track');
  expect(await page.evaluate(async () => (await import('./js/chess-mode.js')).tierOf(window.__gs.state().ladder))).toBe(2);
  await go(page, 'sprint');
  await solvePuzzle(page); await page.waitForTimeout(1000);
  await expect(page.locator('[data-testid=score]')).toHaveText('1');
  await page.evaluate(() => window.__gs.sprintEnd());
  await expect(page.locator('[data-testid=results]')).toBeVisible();
  expect((await S(page)).stats.bestSprint).toBeGreaterThanOrEqual(1);
  w.expectClean();
});

test('penalty shootout: right answers let you shoot, 5 kicks then results', async ({ page }) => {
  const w = watchErrors(page);
  await open(page, 'soccer');
  await page.locator('[data-testid=shootout]').click();
  await answer(page, true);
  await expect(page.locator('[data-testid=zone]')).toHaveCount(6);
  await page.locator('[data-testid=zone]').nth(2).click();
  await expect(page.locator('[data-testid=kickmsg]')).toHaveText(/GOAAAL|SAVED/);
  await expect(page.locator('[data-testid=qcount]')).toHaveText('2/5', { timeout: 5000 });
  await playQuiz(page, { penalty: true, wrongAt: [0] });
  await expect(page.locator('[data-testid=results]')).toBeVisible();
  expect((await S(page)).bests.shoot_1.plays).toBe(1);
  w.expectClean();
});

test('soccer trivia plays to the end at Legend', async ({ page }) => {
  const w = watchErrors(page);
  await open(page); await go(page, 'soctrivia', { lvl: 3 });
  await playQuiz(page);
  expect((await S(page)).stats.soccerRight).toBe(10);
  w.expectClean();
});

test('Fact or Fib blitz scores and ends; fact of the day unlocks the vault', async ({ page }) => {
  const w = watchErrors(page);
  await open(page, 'facts');
  await page.locator('[data-testid=fib]').click();
  for (let i = 0; i < 3; i++) { const f = await page.evaluate(() => window.__gs.answer()); await page.locator(f ? '[data-testid=btn-fact]' : '[data-testid=btn-fib]').click(); await page.waitForTimeout(800); }
  await expect(page.locator('[data-testid=score]')).toHaveText('3');
  await page.evaluate(() => window.__gs.timeUp());
  await expect(page.locator('[data-testid=results]')).toBeVisible();
  expect((await S(page)).stats.bestFib).toBe(3);
  await go(page, 'fotd');
  await answer(page, true);
  await expect(page.locator('[data-testid=why]')).toContainText('Vault');
  await page.locator('[data-testid=fotd-done]').click();
  await page.locator('[data-testid=vault]').click();
  await expect(page.locator('.vt.open')).toHaveCount(1);
  await page.locator('.vt.open').click(); await expect(page.locator('[data-testid=vault-card]')).toBeVisible();
  await page.locator('[data-testid=vault-close]').click(); await expect(page.locator('[data-testid=vault-card]')).toBeHidden();
  w.expectClean();
});

test('quick fact quiz unlocks facts', async ({ page }) => {
  const w = watchErrors(page);
  await open(page); await go(page, 'factquiz');
  await playQuiz(page);
  expect((await S(page)).facts.length).toBe(10);
  w.expectClean();
});

test('daily challenge: finishing marks today done and starts a streak; puzzle of the day solves', async ({ page }) => {
  const w = watchErrors(page);
  await open(page, 'daily');
  await page.locator('[data-testid=daily-play]').click();
  await playQuiz(page);
  await page.locator('[data-testid=done]').click();
  await expect(page.locator('[data-testid=daily-score]')).toBeVisible();
  await page.locator('[data-testid=potd]').click();
  await solvePuzzle(page);
  await expect(page.locator('[data-testid=results]')).toBeVisible({ timeout: 6000 });
  await go(page, 'home');
  await expect(page.locator('[data-testid=streak]')).toContainText('1');
  await expect(page.locator('[data-testid=go-daily]')).toContainText('Done');
  const s = await S(page); expect(s.daily.done).toBe(true); expect(s.badges.daily).toBeTruthy();
  w.expectClean();
});

test('streak continues from yesterday and earns a shield at 7 days', async ({ page }) => {
  const y = new Date(Date.now() - 86400000); const ymd = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
  await open(page, '', { xp: 140, streak: { count: 6, last: ymd, shields: 0, best: 6 }, bests: {}, badges: {}, stats: {}, facts: [], daily: {}, lessons: {}, ladder: 0, missed: {}, muted: false, seen: {} });
  await expect(page.locator('[data-testid=streak]')).toContainText('6');
  await go(page, 'fib'); await page.evaluate(() => window.__gs.timeUp());
  await expect(page.locator('[data-testid=results]')).toBeVisible();
  const s = await S(page); expect(s.streak.count).toBe(7); expect(s.streak.shields).toBe(1); expect(s.badges.streak7).toBeTruthy();
});

test('level up shows a celebration', async ({ page }) => {
  await open(page, '', { xp: 148, streak: { count: 0, last: null, shields: 0, best: 0 }, bests: {}, badges: {}, stats: {}, facts: [], daily: {}, lessons: {}, ladder: 0, missed: {}, muted: false, seen: {} });
  await go(page, 'flagquiz', { lvl: 1 }); await playQuiz(page);
  await expect(page.locator('[data-testid=levelup]')).toBeVisible({ timeout: 3000 });
  await page.locator('[data-testid=levelup] button').click(); await expect(page.locator('[data-testid=levelup]')).toHaveCount(0);
});

test('mute is remembered, trophies show badges, reset clears progress', async ({ page }) => {
  const w = watchErrors(page);
  await open(page);
  await page.locator('[data-testid=mute]').click();
  await page.reload(); await page.waitForFunction(() => window.__gs && window.__gs.ready);
  await expect(page.locator('[data-testid=mute]')).toHaveText('🔇');
  await go(page, 'fib'); await page.evaluate(() => window.__gs.timeUp()); await expect(page.locator('[data-testid=results]')).toBeVisible();
  await go(page, 'trophies');
  await expect(page.locator('[data-testid=badge].got')).toHaveCount(1);
  page.once('dialog', d => d.accept());
  await page.locator('[data-testid=reset]').click();
  expect(await screen(page)).toBe('home');
  expect((await S(page)).xp).toBe(0);
  w.expectClean();
});
