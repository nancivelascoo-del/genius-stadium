# Testing Brainiac FunZone

Every push to `main` runs the full test suite in GitHub Actions. The site is only deployed to GitHub Pages if **all tests pass** (the `deploy` job `needs: test`).

## What is tested

The game is tested in **Chromium and WebKit** (WebKit is the engine inside iPad Safari) at three screen sizes:

| Project | Size |
|---|---|
| `*-ipad-landscape` | 1180 × 820, touch |
| `*-ipad-portrait` | 820 × 1180, touch |
| `*-phone` | 390 × 844, touch, mobile |

| File | Checks |
|---|---|
| `tests/screens.spec.js` | Opens every screen by tapping the real buttons from Home: Daily, Daily Mix, Puzzle of the Day, all Geo modes (World and USA), Chess hub, every lesson, Ladder, Sprint, Soccer, Shootout, Trivia, Fact Lab, Fact of the Day, Fact or Fib, Quick Quiz, Vault, and Trophies. On each screen it checks for **no console errors or failed loads**, **no sideways overflow**, buttons at least 36 px, and a working Back button. It also checks every region and level chip. |
| `tests/play.spec.js` | Plays the game. Covers speed points, wrong-answer feedback with Next, flag/capital/USA-capital quizzes played to the end, and map taps (right tap turns green, wrong tap names the place you hit, 3 misses reveal the answer). Checks that every map target in every region can be tapped and that the zoom buttons work. For **chess**: illegal moves are ignored, a wrong legal move bounces back, the right move solves; Hint and Show me work; all 6 lessons can be completed; the Ladder climbs; the Sprint scores. Also covers the penalty shootout (shoot after a right answer, 5 kicks), Fact or Fib, Vault unlocks, Daily challenge and streak, the 7-day streak shield, level-up, mute saved after reload, badges, and reset. |
| `tests/offline.spec.js` | The service worker installs and caches everything. After going **offline** and reloading, the game still works: menus, a flag quiz with flags loading, a map tap, and a chess move, plus a fresh offline tab. Also checks the app makes **no requests to other websites**, and that the manifest and icons load. |
| `tests/levels.spec.js` | Release 2. Checks the Brainiac FunZone name, the doodle home and the bundled fonts. Checks the Review screens (✓/✗ items, the right answer, retry missed) for quizzes, the map, Fact or Fib, the shootout, Daily Hard and the chess ladder. Checks the Easy to Expert pickers, Expert timers and Expert content. Checks chess tiers, Pro lessons and the skip-ahead test. Checks Puzzle Blitz (3 or 5 min, hard start, 3 strikes) and Rated Puzzles (rating moves up and down). Checks the bots: Stockfish loads, play as Black, undo and hint, two-tap resign, mate/stalemate/insufficient-material results, resume after reload, ratings 400 to 2000. Checks the Chess.com Daily Puzzle (the API is mocked; it falls back to our puzzle when offline or blocked) and the optional ratings card (off by default; nothing is sent until it's turned on). |
| `tests/data.spec.js` | Content checks, run once. Every precached file loads. Every chess puzzle line is legal, and mate puzzles really end in checkmate. Every country has a flag file, every map target has a name, and there are 50 states with spot-checked capitals. Quiz questions have 4 different choices and a "why" line, with no duplicates. |

The CI step `node tools/build-sw.js --check` fails if the offline file list in `sw.js` is out of date.

## Run it yourself

```bash
npm install
npx playwright install chromium webkit
npm test                       # all browsers and sizes
BROWSERS=chromium npx playwright test --project=chromium-phone   # just one
npm run serve                  # play locally at http://127.0.0.1:4173/genius-stadium/
```

Set `SHOTS_DIR=screenshots` to save a screenshot of every screen for every size.

If you change any game file, run `node tools/build-sw.js` so the offline copy updates.

## Test hook

Tests open the game with `?test` in the URL. That turns on `window.__gs`, which lets a test read the right answer or chess move and jump to a screen. Without `?test` the hook does not exist.

## Not covered by automated tests

- How the sound effects actually sound, since tests can't listen.
- Real finger pinch-zoom on the map. Tests check the zoom buttons and mouse taps; the pinch code uses standard pointer events.
- "Add to Home Screen" on a real iPad. Tests check the manifest and icons; installing needs a real device.
