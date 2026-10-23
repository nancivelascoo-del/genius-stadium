// Chess.com extras. Uses Chess.com's free Published-Data API (https://www.chess.com/news/view/published-data-api):
// plain GET requests, only when he taps in, and only when online. The API allows browser requests (CORS: *).
// - Daily Puzzle: /pub/puzzle, fetched at most once a day (kept on the device). Offline or on any error: our own puzzle.
// - Optional ratings card (OFF by default): /pub/player/{username}/stats for a username typed in on the device.
import { Chess } from './chess.js';
import { POOL } from './puzzles.js';
import { S, save, $, esc, sfx, route, go, topbar, today, dayNumber, onCleanup } from './core.js';
import { finishRound } from './quiz.js';
import { playPuzzle, pzReviewItem, chessReview } from './chess-mode.js';

const API = 'https://api.chess.com/pub/';
async function getJSON(path, ms = 7000) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
  try { const r = await fetch(API + path, { signal: ac.signal, headers: { Accept: 'application/json' } }); if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; } return await r.json(); }
  finally { clearTimeout(t); }
}
// Turn Chess.com's {fen, pgn} into our puzzle format (moves as e2e4). Returns null if anything looks wrong.
export function ccToPuzzle(d) {
  try {
    if (!d || typeof d.fen !== 'string' || typeof d.pgn !== 'string') return null;
    const ch = new Chess(d.fen);
    const text = d.pgn.split('\n').filter(l => !l.trim().startsWith('[')).join(' ').replace(/\{[^}]*\}/g, ' ').replace(/\([^)]*\)/g, ' ').replace(/\$\d+/g, ' ');
    const toks = text.replace(/\d+\.(\.\.)?/g, ' ').split(/\s+/).filter(t => t && !['*', '1-0', '0-1', '1/2-1/2'].includes(t));
    const line = [];
    for (const t of toks) { const m = ch.move(t.replace(/[!?]+$/, '')); line.push(m.from + m.to + (m.promotion || '')); }
    if (!line.length) return null;
    if (line.length % 2 === 0) { line.pop(); ch.undo(); } // end on his own move
    const url = typeof d.url === 'string' && /^https:\/\/www\.chess\.com\//.test(d.url) ? d.url : 'https://www.chess.com/daily-chess-puzzle';
    return { id: 'cc-' + (d.publish_time || 0), fen: d.fen, line, mate: ch.isCheckmate(), d: 3, theme: 'cc', label: 'Daily Puzzle', title: String(d.title || 'Daily Puzzle').slice(0, 80), url };
  } catch (e) { return null; }
}
const ownPuzzle = () => { const p = POOL.filter(x => x.d === 3 || x.d === 4); return p[dayNumber() % p.length]; };

route('ccdaily', view => {
  view.innerHTML = `${topbar('🌐 Daily Puzzle', 'chess')}<p class="center muted" data-testid="ccsource">Loading today's puzzle…</p><div class="pzbox"></div><p class="center small cccredit" data-testid="cccredit"></p>`;
  let left = false; const box = $('.pzbox', view);
  const start = (pz, fromCC) => {
    if (left) return;
    const src = $('[data-testid=ccsource]', view); src.dataset.src = fromCC ? 'chesscom' : 'own';
    src.innerHTML = fromCC ? `“${esc(pz.title)}”` : (navigator.onLine ? "Couldn't reach Chess.com, so here's today's FunZone puzzle." : "You're offline, so here's today's FunZone puzzle.");
    $('[data-testid=cccredit]', view).innerHTML = fromCC ? `Puzzle from <a href="${esc(pz.url)}" target="_blank" rel="noopener">Chess.com</a>` : '';
    playPuzzle(box, pz, { onEnd(ok, ft, inf) {
      if (fromCC && ok) { S.ccDone = today(); save(); }
      chessReview([pzReviewItem(pz, ok, ft, inf)]);
      finishRound(view, { title: fromCC ? 'Chess.com Daily Puzzle' : 'Daily Puzzle', back: 'chess', again: () => go('ccdaily'), acc: ft ? 100 : ok ? 60 : 0, big: ft ? 'First try! 🎯' : ok ? 'Solved ✅' : 'Shown 👀', xp: ft ? 40 : ok ? 20 : 5,
        lines: fromCC ? [['Puzzle', pz.title], ['From', 'Chess.com']] : [] });
    } });
  };
  onCleanup(() => { left = true; });
  const cached = S.ccPuzzle && S.ccPuzzle.date === today() ? ccToPuzzle(S.ccPuzzle.data) : null;
  if (cached) return start(cached, true);
  if (!navigator.onLine) return start(ownPuzzle(), false);
  getJSON('puzzle').then(d => {
    const pz = ccToPuzzle(d); if (!pz) throw new Error('bad puzzle');
    S.ccPuzzle = { date: today(), data: { title: d.title, url: d.url, fen: d.fen, pgn: d.pgn, publish_time: d.publish_time } }; save();
    start(pz, true);
  }).catch(() => start(ownPuzzle(), false));
});

// Optional: show his public Chess.com ratings. OFF until a grown-up turns it on and types a username.
const RATING_ROWS = [['chess_rapid', '🐇 Rapid'], ['chess_blitz', '⚡ Blitz'], ['chess_bullet', '🚀 Bullet'], ['chess_daily', '📅 Daily']];
route('ccstats', view => {
  const on = !!S.ccStatsOn, user = S.ccUser || '';
  view.innerHTML = `${topbar('🌐 Chess.com ratings', 'chess')}
  <section class="card ccstats">
    <p>See your <b>public</b> Chess.com ratings here. This is <b>off</b> unless you turn it on. Only the username is sent to Chess.com, and only when you tap “Show my ratings”.</p>
    <div class="row"><button class="btn ${on ? 'primary' : ''}" data-testid="cc-toggle">${on ? '✅ On' : '⬜ Off'}</button></div>
    ${on ? `<div class="row"><input class="ccuser" data-testid="cc-user" maxlength="25" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Chess.com username" value="${esc(user)}"><button class="btn primary" data-testid="cc-show">Show my ratings</button></div>
    <div data-testid="cc-out" class="ccout"></div>` : ''}
  </section>`;
  $('[data-testid=cc-toggle]', view).onclick = () => { S.ccStatsOn = !on; save(); sfx.tap(); go('ccstats'); };
  if (!on) return;
  const out = $('[data-testid=cc-out]', view);
  $('[data-testid=cc-show]', view).onclick = async () => {
    const u = $('[data-testid=cc-user]', view).value.trim();
    if (!/^[A-Za-z0-9_-]{3,25}$/.test(u)) { out.textContent = 'Usernames use 3 to 25 letters, numbers, - or _.'; return; }
    S.ccUser = u; save();
    if (!navigator.onLine) { out.textContent = "You're offline. Try again when you have internet."; return; }
    out.textContent = 'Asking Chess.com…';
    try {
      const d = await getJSON('player/' + encodeURIComponent(u.toLowerCase()) + '/stats');
      const tiles = RATING_ROWS.filter(([k]) => d[k] && d[k].last).map(([k, n]) => [n, d[k].last.rating, d[k].best ? d[k].best.rating : null]);
      if (d.tactics && d.tactics.highest) tiles.push(['🧩 Puzzles (best)', d.tactics.highest.rating, null]);
      if (d.puzzle_rush && d.puzzle_rush.best) tiles.push(['⏱️ Puzzle Rush best', d.puzzle_rush.best.score, null]);
      out.innerHTML = tiles.length ? `<div class="cctiles">${tiles.map(([n, r, b]) => `<div class="cctile" data-testid="cc-tile"><small>${n}</small><b>${esc(String(r))}</b>${b ? `<small>Best ${esc(String(b))}</small>` : ''}</div>`).join('')}</div><p class="small muted">From <a href="https://www.chess.com/member/${encodeURIComponent(u)}" target="_blank" rel="noopener">Chess.com</a></p>` : 'No rated games yet on that account.';
    } catch (e) { out.textContent = e.status === 404 ? 'No Chess.com player with that username.' : "Couldn't reach Chess.com right now."; }
  };
});
