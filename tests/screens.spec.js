// Every screen opens by tapping through the real buttons, fits the screen, has big-enough buttons, and logs no errors.
const { test, expect } = require('@playwright/test');
const { watchErrors, open, screen, sidewaysOverflow, smallButtons, shot } = require('./helpers');

// [name, taps from home (data-testid, in order), expected screen]
const PATHS = [
  ['home', [], 'home'],
  ['daily', ['go-daily'], 'daily'],
  ['daily-mix', ['go-daily', 'daily-play'], 'dailymix'],
  ['puzzle-of-the-day', ['go-daily', 'potd'], 'potd'],
  ['daily-fact', ['go-daily', 'daily-fotd'], 'fotd'],
  ['geo-world', ['go-geo', 'tab-world'], 'geo'],
  ['geo-map-sprint', ['go-geo', 'tab-world', 'map-sprint'], 'mapplay'],
  ['geo-map-full', ['go-geo', 'tab-world', 'map-full'], 'mapplay'],
  ['geo-flags', ['go-geo', 'tab-world', 'flags'], 'flagquiz'],
  ['geo-capitals', ['go-geo', 'tab-world', 'caps'], 'capquiz'],
  ['geo-explore', ['go-geo', 'tab-world', 'explore'], 'explore'],
  ['geo-usa', ['go-geo', 'tab-usa'], 'geo'],
  ['geo-usa-sprint', ['go-geo', 'tab-usa', 'usa-sprint'], 'mapplay'],
  ['geo-usa-full', ['go-geo', 'tab-usa', 'usa-full'], 'mapplay'],
  ['geo-usa-capitals', ['go-geo', 'tab-usa', 'usa-caps'], 'capquiz'],
  ['geo-usa-explore', ['go-geo', 'tab-usa', 'usa-explore'], 'explore'],
  ['chess', ['go-chess'], 'chess'],
  ['chess-ladder', ['go-chess', 'ladder'], 'ladder'],
  ['chess-sprint', ['go-chess', 'sprint'], 'sprint'],
  ['chess-lesson', ['go-chess', 'lesson'], 'lesson'],
  ['soccer', ['go-soccer'], 'soccer'],
  ['soccer-shootout', ['go-soccer', 'shootout'], 'shootout'],
  ['soccer-trivia', ['go-soccer', 'soctrivia'], 'soctrivia'],
  ['facts', ['go-facts'], 'facts'],
  ['facts-fotd', ['go-facts', 'fotd'], 'fotd'],
  ['facts-fib', ['go-facts', 'fib'], 'fib'],
  ['facts-quiz', ['go-facts', 'factquiz'], 'factquiz'],
  ['facts-vault', ['go-facts', 'vault'], 'vault'],
  ['trophies', ['go-trophies'], 'trophies'],
  ['chess-vs', ['go-chess', 'go-vs'], 'vs'],
  ['chess-vs-game', ['go-chess', 'go-vs', 'opp'], 'vsgame'],
  ['chess-placement', ['go-chess', 'placement'], 'placement'],
  ['chess-blitz-hard', ['go-chess', 'blitz-5', 'blitz-hard', 'sprint'], 'sprint'],
  ['chess-rated', ['go-chess', 'rated'], 'rated'],
  ['chess-ccstats', ['go-chess', 'go-ccstats'], 'ccstats'],
  ['geo-expert-flags', ['go-geo', 'tab-world', 'lvl-4', 'flags'], 'flagquiz'],
  ['daily-hard', ['go-daily', 'daily-hard'], 'daily'],
];

for (const [name, taps, want] of PATHS) {
  test(`${name}: opens, fits, no errors`, async ({ page }, info) => {
    const w = watchErrors(page);
    await open(page);
    for (const t of taps) { await page.locator(`[data-testid="${t}"]`).first().click(); await page.waitForTimeout(120); }
    expect(await screen(page)).toBe(want);
    await page.waitForTimeout(350);
    const o = await sidewaysOverflow(page);
    expect(o.scroll, 'page does not scroll sideways').toBeLessThanOrEqual(1);
    expect(o.bad, 'nothing sticks out past the screen edge').toEqual([]);
    expect(await smallButtons(page), 'buttons are at least 36px (finger-sized)').toEqual([]);
    await shot(page, info, name);
    // the back button always returns somewhere sensible
    if (want !== 'home') { await page.locator('[data-testid=back]').click(); expect(await screen(page)).not.toBe(want); }
    w.expectClean();
  });
}

test('home buttons each open their screen and back returns home', async ({ page }) => {
  const w = watchErrors(page);
  await open(page);
  for (const [b, s] of [['go-daily', 'daily'], ['go-geo', 'geo'], ['go-chess', 'chess'], ['go-soccer', 'soccer'], ['go-facts', 'facts'], ['go-trophies', 'trophies']]) {
    await page.locator(`[data-testid=${b}]`).click(); expect(await screen(page)).toBe(s);
    await expect(page).toHaveURL(new RegExp('#' + s + '$'));
    await page.locator('[data-testid=back]').click(); expect(await screen(page)).toBe('home');
  }
  w.expectClean();
});

test('every region chip and level chip works', async ({ page }) => {
  const w = watchErrors(page);
  await open(page, 'geo');
  await page.locator('[data-testid=tab-world]').click();
  const n = await page.locator('[data-testid=regions] .chip').count(); expect(n).toBe(7);
  for (let i = 0; i < n; i++) { await page.locator('[data-testid=regions] .chip').nth(i).click(); await expect(page.locator('[data-testid=regions] .chip').nth(i)).toHaveClass(/on/); }
  for (const l of [1, 2, 3, 4]) { await page.locator(`[data-testid=lvl-${l}]`).first().click(); await expect(page.locator(`[data-testid=lvl-${l}]`).first()).toHaveClass(/on/); }
  await open(page, 'soccer');
  for (const l of [4, 3, 2, 1]) { await page.locator(`[data-testid=lvl-${l}]`).click(); await expect(page.locator(`[data-testid=lvl-${l}]`)).toHaveClass(/on/); }
  w.expectClean();
});

test('every chess lesson opens', async ({ page }) => {
  const w = watchErrors(page);
  await open(page, 'chess');
  const n = await page.locator('[data-testid=lesson]').count(); expect(n).toBe(11); // 6 lessons + 5 Pro lessons
  for (let i = 0; i < n; i++) {
    await page.locator('[data-testid=lesson]').nth(i).click(); expect(await screen(page)).toBe('lesson');
    await expect(page.locator('[data-testid=board] .sq')).toHaveCount(64);
    expect(await page.locator('[data-testid=board] .pc').count()).toBeGreaterThan(2);
    await page.locator('[data-testid=back]').click();
  }
  w.expectClean();
});
