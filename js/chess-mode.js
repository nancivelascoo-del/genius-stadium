// Chess Lab (modes inspired by Chess.com, our own names and art): lessons, puzzle ladder, rated puzzles, Puzzle Blitz. Moves validated with chess.js.
import { Chess } from './chess.js';
import { PIECES, PIECE_VB } from './pieces.js';
import { LESSONS, POOL } from './puzzles.js';
import { S, save, $, $$, esc, sfx, toast, seeded, fmtTime, route, go, topbar, hook, bump, setMax, onCleanup, confetti, addXP } from './core.js';
import { finishRound, levelUp, setReview } from './quiz.js';

const THEME = { mate1: 'Mate in 1', mate2: 'Mate in 2', fork: 'Win material', win: 'Win material', mate2q: 'Mate in 2 · first move is NOT a check!', mate3: 'Mate in 3', combo: '2-move combo', defend: 'Defend! Only one move saves you', pawnend: 'Endgame: the only winning move', endmate: 'Endgame mate' };
export const TIERS = [
  { d: 1, name: 'Mate in 1', icon: '♚' }, { d: 2, name: 'Win material', icon: '💰' }, { d: 3, name: 'Mate in 2', icon: '🧠' },
  { d: 4, name: 'Pro: combos & sneaky mates', icon: '⚡' }, { d: 5, name: 'Master: mate in 3, defense, endgames', icon: '🏔️' },
];
// Puzzle rating (Elo-style, like Chess.com puzzles): each puzzle has a rating from its tier, and he starts at 800.
const TIER_RATING = { 1: 500, 2: 800, 3: 1100, 4: 1400, 5: 1700 };
export function pzRating(pz) { let h = 0; for (const c of pz.id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return TIER_RATING[pz.d || 3] + (h % 200); }
export const myRating = () => S.prating || 800;
export function rate(pz, ok) { // returns the change
  const R = myRating(), P = pzRating(pz), E = 1 / (1 + Math.pow(10, (P - R) / 400)), K = (S.pcount || 0) < 20 ? 40 : 24;
  const d = Math.round(K * ((ok ? 1 : 0) - E)) || (ok ? 1 : -1);
  S.prating = Math.max(100, R + d); S.pcount = (S.pcount || 0) + 1; S.ppeak = Math.max(S.ppeak || 800, S.prating); save(); return d;
}
const FILES = 'abcdefgh';
function pieceSvg(p) {
  const c = p.color, t = p.type;
  if (c === 'w') return `<svg viewBox="${PIECE_VB}" class="pc"><g transform="scale(1,1)"><path d="${PIECES['b' + t]}" fill="#fff"/><path d="${PIECES['w' + t]}" fill="#1d1d1d"/></g></svg>`;
  return `<svg viewBox="${PIECE_VB}" class="pc"><path d="${PIECES['w' + t]}" fill="#1d1d1d" stroke="#1d1d1d" stroke-width="40"/><path d="${PIECES['b' + t]}" fill="#1d1d1d"/></svg>`;
}

route('chess', view => {
  const basic = LESSONS.filter(l => !l.pro), pro = LESSONS.filter(l => l.pro);
  const done = basic.filter(l => S.lessons[l.id] && S.lessons[l.id].done).length, pdone = pro.filter(l => S.lessons[l.id] && S.lessons[l.id].done).length;
  const cur = tierOf(S.ladder), open = unlockedTier(); const mins = S.seen.blitzMins === 5 ? 5 : 3, hard = !!S.seen.blitzHard;
  const lessonBtn = l => { const s2 = S.lessons[l.id] || {}; return `<button class="lesson card ${s2.done ? 'done' : ''} ${l.pro ? 'pro' : ''}" data-l="${l.id}" data-testid="lesson"><span class="li">${l.icon}</span><b>${esc(l.title)}</b><small>${s2.done ? '✅ ' + '★'.repeat(s2.stars || 0) : l.puzzles.length + ' puzzles'}</small></button>`; };
  const bb = S.stats[sprintStat(mins, hard)];
  view.innerHTML = `${topbar('♟️ Chess Lab', 'home', `<div class="hud"><span class="pill rating" data-testid="prating" title="Puzzle rating">📈 ${myRating()}</span></div>`)}
  <button class="card vscard" data-testid="go-vs"><span class="avas">🐣🐢🦊🦉🐉🤖</span><span><b>Play the Bots</b><small>6 chess bots rated 400 to 2000. Can you beat them all?</small></span><span class="go">›</span></button>
  <div class="modes">
    <div class="mode card cc"><div class="mi">⚡</div><h3>Puzzle Blitz</h3><p>Solve as many as you can before time runs out. They get harder. 3 strikes and you're out!</p>
      <div class="chips small center"><button class="chip ${mins === 3 ? 'on' : ''}" data-m="3" data-testid="blitz-3">3 min</button><button class="chip ${mins === 5 ? 'on' : ''}" data-m="5" data-testid="blitz-5">5 min</button>
      <button class="chip ${!hard ? 'on' : ''}" data-h="0" data-testid="blitz-easy">Easy start</button><button class="chip ${hard ? 'on' : ''}" data-h="1" data-testid="blitz-hard">🔥 Hard start</button></div>
      <button class="btn primary go-green" data-testid="sprint">Start ${mins}-minute Blitz</button><small>${bb ? 'Best ' + bb + ' solved' : 'No best yet'}</small></div>
    <div class="mode card cc"><div class="mi">📈</div><h3>Rated Puzzles</h3><p>Your puzzle rating goes <b>up</b> when you solve and <b>down</b> when you miss. One try each!</p>
      <button class="btn primary go-green" data-testid="rated">Play 10 rated puzzles</button><small>Rating ${myRating()}${S.ppeak ? ' · Best ' + S.ppeak : ''}</small></div>
    <div class="mode card cc"><div class="mi">🌐</div><h3>Daily Puzzle</h3><p>${navigator.onLine ? "Today's puzzle from Chess.com." : "You're offline, so you'll get today's FunZone puzzle."}</p>
      <button class="btn primary go-green" data-testid="go-ccdaily">Solve today's puzzle</button></div>
    <div class="mode card wide"><div class="mi">🪜</div><h3>Puzzle Ladder</h3><p>Rung <b data-testid="rung">${S.ladder + 1}</b> · Tier ${cur}: ${TIERS[cur - 1].name}</p>
      <div class="tiers" data-testid="tiers">${TIERS.map(t => `<button class="tier ${t.d === cur ? 'on' : ''} ${t.d <= open ? '' : 'locked'}" data-t="${t.d}" data-testid="tier-${t.d}" aria-label="Tier ${t.d}: ${t.name}"><span>${t.d <= open ? t.icon : '🔒'}</span><small>${t.d}</small></button>`).join('')}</div>
      <div class="row"><button class="btn primary big" data-testid="ladder">Climb (5 puzzles)</button><button class="btn" data-testid="placement">🚀 Too easy? Skip-ahead test</button></div></div>
  </div>
  <h2 class="sec">Lessons <small>${done}/${basic.length}</small></h2>
  <div class="lessons">${basic.map(lessonBtn).join('')}</div>
  <h2 class="sec">Pro lessons <small>${pdone}/${pro.length}</small></h2>
  <div class="lessons">${pro.map(lessonBtn).join('')}</div>
  <p class="center muted small credit" data-testid="chess-credit">Puzzle Blitz, rated puzzles and the bots are inspired by <a href="https://www.chess.com/" target="_blank" rel="noopener">Chess.com</a>, with our own names and art. FunZone is not made by Chess.com.<br><button class="linkbtn" data-testid="go-ccstats">Chess.com ratings (optional, off)</button></p>`;
  $$('[data-l]', view).forEach(b => b.onclick = () => { sfx.tap(); go('lesson', { id: b.dataset.l }); });
  $$('[data-t]', view).forEach(b => b.onclick = () => { const d = +b.dataset.t; if (d > unlockedTier()) { sfx.bad(); toast('🔒 Climb the ladder or take the Skip-ahead test to unlock Tier ' + d); return; } sfx.tap(); S.ladder = tierStart(d); save(); go('chess'); });
  $$('[data-m]', view).forEach(b => b.onclick = () => { S.seen.blitzMins = +b.dataset.m; save(); sfx.tap(); go('chess'); });
  $$('[data-h]', view).forEach(b => b.onclick = () => { S.seen.blitzHard = b.dataset.h === '1'; save(); sfx.tap(); go('chess'); });
  $('[data-testid=ladder]', view).onclick = () => { sfx.tap(); go('ladder'); };
  $('[data-testid=placement]', view).onclick = () => { sfx.tap(); go('placement'); };
  $('[data-testid=rated]', view).onclick = () => { sfx.tap(); go('rated'); };
  $('[data-testid=go-ccdaily]', view).onclick = () => { sfx.tap(); go('ccdaily'); };
  $('[data-testid=go-ccstats]', view).onclick = () => { sfx.tap(); go('ccstats'); };
  $('[data-testid=go-vs]', view).onclick = () => { sfx.tap(); go('vs'); };
  $('[data-testid=sprint]', view).onclick = () => { sfx.tap(); go('sprint', { mins, start: hard ? 'hard' : 'easy' }); };
});
const sprintStat = (mins, hard) => mins === 3 && !hard ? 'bestSprint' : 'bestSprint_' + mins + (hard ? 'h' : '');
let ORDER = null;
export function tierStart(d) { const o = ladderOrder(); const i = o.findIndex(p => p.d === d); return i < 0 ? 0 : i; }
export function tierOf(rung) { const o = ladderOrder(); return o[rung % o.length].d; }
export function unlockedTier() { return Math.max(S.tier || 1, tierOf(S.ladder)); }
function ladderOrder() { // fixed order, easy to hard; tiers 1-3 keep their old order so saved rungs still match
  if (ORDER) return ORDER;
  const r = seeded(7); const sh = a => a.map(x => [r(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  return (ORDER = [1, 2, 3, 4, 5].flatMap(d => sh(POOL.filter(p => p.d === d))));
}

// ---------- board ----------
export function Board(box, fen, onUserMove, opts = {}) {
  const chess = new Chess(fen); const orient = opts.orient || chess.turn(); let sel = null, last = null, locked = false, hintSq = null;
  box.innerHTML = `<div class="board ${orient === 'b' ? 'flip' : ''}" data-testid="board"></div>`;
  const el = $('.board', box);
  const squares = []; for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) { const rank = orient === 'w' ? 8 - r : r + 1, file = orient === 'w' ? f : 7 - f; squares.push(FILES[file] + rank); }
  el.innerHTML = squares.map((sq, i) => { const f = FILES.indexOf(sq[0]), rk = +sq[1]; const light = (f + rk) % 2 === 1;
    return `<div class="sq ${light ? 'l' : 'd'}" data-sq="${sq}">${i % 8 === 0 ? `<span class="rk">${rk}</span>` : ''}${i >= 56 ? `<span class="fl">${sq[0]}</span>` : ''}<div class="p"></div></div>`; }).join('');
  const sqEl = sq => el.querySelector(`[data-sq="${sq}"]`);
  function draw() {
    for (const sq of squares) { const p = chess.get(sq); const s = sqEl(sq); s.querySelector('.p').innerHTML = p ? pieceSvg(p) : ''; s.classList.remove('sel', 'tgt', 'cap', 'last', 'check', 'hint'); s.dataset.piece = p ? p.color + p.type : ''; }
    if (last) { sqEl(last.from).classList.add('last'); sqEl(last.to).classList.add('last'); }
    if (chess.inCheck()) { const k = squares.find(sq => { const p = chess.get(sq); return p && p.type === 'k' && p.color === chess.turn(); }); if (k) sqEl(k).classList.add('check'); }
    if (sel) { sqEl(sel).classList.add('sel'); chess.moves({ square: sel, verbose: true }).forEach(m => sqEl(m.to).classList.add(m.captured ? 'cap' : 'tgt')); }
    if (hintSq) [].concat(hintSq).forEach(h => sqEl(h).classList.add('hint'));
  }
  function tryMove(from, to) {
    const moves = chess.moves({ square: from, verbose: true }).filter(m => m.to === to);
    if (!moves.length) return false;
    sel = null; onUserMove(from + to, moves.some(m => m.promotion)); return true;
  }
  let downSq = null;
  el.addEventListener('pointerdown', e => {
    if (locked) return; const s = e.target.closest('.sq'); if (!s) return; const sq = s.dataset.sq; const p = chess.get(sq);
    if (sel && sel !== sq && tryMove(sel, sq)) { downSq = null; return; }
    if (p && p.color === chess.turn()) { sel = sq; downSq = sq; sfx.tap(); draw(); } else { sel = null; downSq = null; draw(); }
  });
  el.addEventListener('pointerup', e => {
    if (locked || !downSq) return; const hit = document.elementFromPoint(e.clientX, e.clientY); const s = hit && hit.closest('.sq'); downSq = null;
    if (s && sel && s.dataset.sq !== sel) tryMove(sel, s.dataset.sq);
  });
  draw();
  return {
    chess, orient,
    play(uci, silent) { const m = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || 'q' }); last = { from: m.from, to: m.to }; hintSq = null; if (!silent) sfx.move(); draw(); return m; },
    undo() { chess.undo(); hintSq = null; const h = chess.history({ verbose: true }); const m = h[h.length - 1]; last = m ? { from: m.from, to: m.to } : null; draw(); },
    lock(v) { locked = v; sel = null; draw(); }, hint(sq) { hintSq = sq; draw(); }, flashWrong(sq) { const s = sqEl(sq); s.classList.add('bad'); setTimeout(() => s.classList.remove('bad'), 500); },
    tap(sq) { const s = sqEl(sq); const r = s.getBoundingClientRect(); const o = { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1 }; s.dispatchEvent(new PointerEvent('pointerdown', o)); s.dispatchEvent(new PointerEvent('pointerup', o)); },
  };
}
function mateIn1Exists(ch) { for (const m of ch.moves({ verbose: true })) { ch.move(m); const ok = ch.isCheckmate(); ch.undo(); if (ok) return true; } return false; }
function forcesMateIn1(ch) { // side that just moved; every reply allows a mate-in-1
  if (ch.isCheckmate()) return true; const rs = ch.moves({ verbose: true }); if (!rs.length) return false;
  for (const r of rs) { ch.move(r); const ok = mateIn1Exists(ch); ch.undo(); if (!ok) return false; } return true;
}

// Play one puzzle. cfg: {strict (sprint: one wrong = fail), onEnd(solved, firstTry)}
export function playPuzzle(box, pz, cfg) {
  const endIf = (...a) => { if (box.isConnected) cfg.onEnd(...a); }; // he may have left the screen during the delay
  box.innerHTML = `<div class="ptop"><span class="turn" data-testid="turn"></span><span class="theme" data-testid="ptheme">${esc(pz.label || (pz.theme === 'endmate' ? 'Endgame: mate in ' + Math.ceil(pz.line.length / 2) : THEME[pz.theme]) || (pz.mate ? (pz.line.length > 1 ? 'Mate in ' + Math.ceil(pz.line.length / 2) : 'Mate in 1') : 'Win material'))}</span></div><div class="bbox"></div>
    <div class="pmsg" data-testid="pmsg"></div><div class="row pbtns"><button class="btn" data-testid="hint">💡 Hint</button>${cfg.strict ? '' : '<button class="btn" data-testid="show">👀 Show me</button>'}</div>`;
  let ply = 0, wrongs = 0, ended = false, usedHint = false, firstWrong = null; const line = pz.line.slice();
  const info = () => ({ wrong: firstWrong, hint: usedHint });
  const board = Board($('.bbox', box), pz.fen, userMove); const msg = $('.pmsg', box);
  $('[data-testid=turn]', box).innerHTML = `<i class="dotc ${board.orient}"></i> ${board.orient === 'w' ? 'White' : 'Black'} to move`;
  let waiting = false;
  hook.solution = () => (ended ? null : waiting ? 'wait' : line[ply]); hook.board = board;
  const say = (t, cls = '') => { msg.className = 'pmsg show ' + cls; msg.textContent = t; };
  function accept(uci) {
    const ch = board.chess; const final = ply >= line.length - 1;
    if (uci === line[ply] || uci === line[ply].slice(0, 4)) return 'line';
    if (ply === 0 && pz.alt0 && pz.alt0.some(a => a.slice(0, 4) === uci)) return 'alt-end';
    if (ply === 2 && pz.alt2 && pz.alt2.some(a => a.slice(0, 4) === uci)) return 'alt-end';
    if (pz.mate) {
      const m = ch.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: 'q' }); let res = null;
      if (final && ch.isCheckmate()) res = 'alt-end';
      else if (!final && line.length === 3 && forcesMateIn1(ch)) res = 'alt-cont';
      ch.undo(); if (m) return res;
    }
    return null;
  }
  function userMove(uci, isPromo) {
    if (ended) return; const a = accept(uci);
    const promo = isPromo ? ((line[ply] && line[ply].slice(0, 4) === uci && line[ply][4]) || 'q') : '';
    board.play(uci + promo);
    if (!a) {
      if (firstWrong == null) { const h = board.chess.history(); firstWrong = h[h.length - 1] || uci; }
      wrongs++; sfx.bad(); board.lock(true); waiting = true;
      if (cfg.strict) { say('✗ Not the best move', 'no'); setTimeout(() => { board.undo(); reveal(false); }, 600); return; }
      say(wrongs >= 2 ? '✗ Here is the answer' : '✗ Not quite. Try again!', 'no');
      setTimeout(() => { waiting = false; board.undo(); board.lock(false); if (wrongs >= 2) reveal(false); }, 650); return;
    }
    sfx.good();
    if (a === 'alt-end' || ply + 1 >= line.length) return win();
    if (a === 'alt-cont') { // another winning key move: reply with the book move if legal, then any mate finishes
      const legal = board.chess.moves({ verbose: true }).map(m => m.from + m.to + (m.promotion || ''));
      const rep = legal.find(m => m.slice(0, 4) === line[1].slice(0, 4)) || legal[0];
      line.splice(1, line.length, rep, 'mate');
    }
    ply++; board.lock(true); waiting = true; say('Good move! Keep going…', 'ok');
    setTimeout(() => { waiting = false; if (ended) return; board.play(line[ply]); ply++; if (ply >= line.length) return win(); board.lock(false); }, 550);
  }
  function win() { ended = true; board.lock(true); const first = wrongs === 0 && !usedHint; say(first ? '✓ Solved! Brilliant!' : '✓ Solved!', 'ok'); if (board.chess.isCheckmate()) confetti(20); setTimeout(() => endIf(true, first, info()), 900); }
  function reveal(solved) {
    ended = true; board.lock(true); let k = ply; const step = () => { if (k >= pz.line.length || line[k] === 'mate') { setTimeout(() => endIf(solved, false, info()), 900); return; } try { board.play(pz.line[k]); } catch (e) { /* line diverged */ } k++; setTimeout(step, 650); };
    say(cfg.strict ? '✗ The answer was…' : 'Watch the answer…', 'no'); setTimeout(step, 400);
  }
  $('[data-testid=hint]', box).onclick = () => { if (ended) return; usedHint = true; const exp = line[ply] === 'mate' ? null : line[ply]; if (exp) board.hint(exp.slice(0, 2)); else say('Look for checkmate!', 'ok'); if (cfg.strict) cfg.onHint && cfg.onHint(); };
  const sb = $('[data-testid=show]', box); if (sb) sb.onclick = () => { if (!ended) { wrongs = 2; reveal(false); } };
  return board;
}

// ---------- review helpers ----------
// The answer line in plain notation, e.g. "1. Qd8+ Rxd8 2. Rxd8#"
export function solutionSan(pz) {
  const ch = new Chess(pz.fen); const out = []; let n = +pz.fen.split(' ')[5] || 1; const black = ch.turn() === 'b';
  for (let k = 0; k < pz.line.length; k++) {
    const u = pz.line[k]; if (u === 'mate') break;
    let m; try { m = ch.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || 'q' }); } catch (e) { m = null; } if (!m) break;
    const w = ch.turn() === 'b'; // white just moved
    out.push((w ? n + '. ' : (k === 0 && black ? n + '... ' : '')) + m.san); if (!w) n++;
  }
  return out.join(' ');
}
export function miniBoard(fen, uci) {
  const ch = new Chess(fen); const flip = ch.turn() === 'b'; const from = uci && uci.slice(0, 2), to = uci && uci.slice(2, 4); let h = '';
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const rank = flip ? r + 1 : 8 - r, file = flip ? 7 - f : f; const sq = FILES[file] + rank; const p = ch.get(sq);
    h += `<i class="${(file + rank) % 2 ? 'l' : 'd'}${sq === from ? ' fr' : ''}${sq === to ? ' to' : ''}">${p ? pieceSvg(p) : ''}</i>`;
  }
  return `<div class="miniboard" aria-hidden="true">${h}</div>`;
}
export function pzReviewItem(pz, ok, first, info = {}) {
  const side = pz.fen.split(' ')[1] === 'w' ? 'White' : 'Black'; const label = pz.label || THEME[pz.theme] || (pz.mate ? 'Checkmate' : 'Puzzle');
  const note = ok && !first ? (info.hint ? 'Solved with a hint' : 'Solved after a wrong try') : '';
  return { ok: !!first, pz, html_full: `<div class="rvchess">${miniBoard(pz.fen, pz.line[0])}<div>
    <div class="rvq"><b>${esc(label)}</b> <small class="muted">${side} to move</small></div>
    <div class="rva">${first ? '<span>✓ Solved first try</span>' : `<span class="mine">Your move: ${info.wrong ? esc(info.wrong) : ok ? 'right move, with help' : 'no move'}${note ? ' · ' + note : ''}</span>`}
    <span class="right">Answer: <b>${esc(solutionSan(pz))}</b></span></div>
    <div class="rvwhy">💡 The blue squares show the first move.</div></div></div>` };
}
export function chessReview(items) {
  const missed = items.filter(x => !x.ok).map(x => x.pz);
  setReview({ items, retry: missed.length ? () => go('pzretry', { puzzles: missed }) : null });
}
route('pzretry', (view, { puzzles }) => {
  let i = 0, first = 0; const items = [];
  view.innerHTML = `${topbar('🔁 Retry missed puzzles', 'chess', `<div class="hud"><span class="pill" data-testid="qcount"></span></div>`)}<div class="pzbox"></div>`;
  function next() {
    if (i >= puzzles.length) { chessReview(items); return finishRound(view, { title: 'Retry missed puzzles', back: 'chess', again: () => go('pzretry', { puzzles }), acc: Math.round(first / puzzles.length * 100), total: puzzles.length, big: first + '/' + puzzles.length, xp: first * 8, lines: [['Fixed first try', first + '/' + puzzles.length]] }); }
    $('[data-testid=qcount]', view).textContent = (i + 1) + '/' + puzzles.length; const pz = puzzles[i];
    playPuzzle($('.pzbox', view), pz, { onEnd(ok, ft, inf) { items.push(pzReviewItem(pz, ok, ft, inf)); if (ft) first++; i++; next(); } });
  }
  next();
});

// ---------- lesson ----------
route('lesson', (view, { id }) => {
  const L = LESSONS.find(l => l.id === id); let i = 0, first = 0; const items = [];
  view.innerHTML = `${topbar(L.icon + ' ' + esc(L.title), 'chess', `<div class="hud"><span class="pill" data-testid="qcount"></span></div>`)}
    <div class="tip card" data-testid="tip">💡 ${esc(L.tip)}</div><div class="pzbox"></div>`;
  function next() {
    if (i >= L.puzzles.length) {
      const stars = first === L.puzzles.length ? 3 : first >= L.puzzles.length - 1 ? 2 : 1; const was = S.lessons[id] && S.lessons[id].done;
      S.lessons[id] = { done: true, stars: Math.max(stars, (S.lessons[id] && S.lessons[id].stars) || 0) }; save();
      S.stats.lessonsDone = Object.values(S.lessons).filter(x => x.done).length; save();
      const acc = Math.round(first / L.puzzles.length * 100); chessReview(items);
      return finishRound(view, { title: L.title, back: 'chess', again: () => go('lesson', { id }), acc, total: L.puzzles.length, big: first + '/' + L.puzzles.length, xp: first * 20 + (was ? 0 : 40), lines: [['Solved first try', first + '/' + L.puzzles.length]] });
    }
    $('[data-testid=qcount]', view).textContent = (i + 1) + '/' + L.puzzles.length;
    const pz = L.puzzles[i];
    playPuzzle($('.pzbox', view), pz, { onEnd(ok, ft, inf) { items.push(pzReviewItem(pz, ok, ft, inf)); if (ft) first++; if (ok) solvedStats(pz); i++; next(); } });
  }
  next();
});

function solvedStats(pz) { if (pz.mate) bump('mates'); if (pz.theme === 'mate2' || pz.theme === 'mate2q') bump('mate2'); if (pz.theme === 'mate3') bump('mate3'); if (pz.d >= 4) bump('proSolved'); }
function noteTier() { const t = tierOf(S.ladder); if (t > (S.tier || 1)) { S.tier = t; save(); } setMax('maxTier', unlockedTier()); }

// ---------- ladder ----------
route('ladder', view => {
  const order = ladderOrder(); let n = 0, first = 0, solved = 0; const startTier = tierOf(S.ladder); const items = [];
  view.innerHTML = `${topbar('🪜 Puzzle Ladder', 'chess', `<div class="hud"><span class="pill" data-testid="qcount"></span><span class="pill" data-testid="rungpill"></span></div>`)}<div class="pzbox"></div>`;
  function next() {
    if (n >= 5) {
      const lines = [['First-try solves', first + '/5']]; const t = tierOf(S.ladder);
      if (first === 5 && t < 5) { const to = Math.max(t, startTier) + 1; S.ladder = Math.max(S.ladder, tierStart(to)); save(); lines.push(['🚀 Fast track!', 'Jumped to Tier ' + to])}
      noteTier(); lines.push(['Now on', 'Rung ' + (S.ladder + 1) + ' · Tier ' + tierOf(S.ladder)]);
      const acc = Math.round(first / 5 * 100); chessReview(items); return finishRound(view, { title: 'Puzzle Ladder', back: 'chess', again: () => go('ladder'), acc, total: 5, big: solved + '/5', xp: first * (12 + 6 * startTier) + solved * 6, lines });
    }
    const pz = order[S.ladder % order.length];
    $('[data-testid=qcount]', view).textContent = (n + 1) + '/5'; $('[data-testid=rungpill]', view).textContent = 'Rung ' + (S.ladder + 1) + ' · T' + pz.d;
    playPuzzle($('.pzbox', view), pz, { onEnd(ok, ft, inf) { items.push(pzReviewItem(pz, ok, ft, inf)); if (ft) first++; if (ok) { solved++; solvedStats(pz); } S.ladder++; save(); noteTier(); n++; next(); } });
  }
  next();
});

// ---------- skip-ahead (placement) test ----------
// 7 puzzles that get harder (tiers 2 to 5). One try each. Two misses ends the test.
// You start at the tier of the hardest puzzle you solved.
route('placement', view => {
  const r = seeded(Date.now() & 0xffff); const pickD = d => { const a = POOL.filter(p => p.d === d); return a[Math.floor(r() * a.length)]; };
  const plan = [2, 3, 3, 4, 4, 5, 5].map(pickD); let k = 0, misses = 0, best = 1, solved = 0; const items = [];
  view.innerHTML = `${topbar('🚀 Skip-ahead Test', 'chess', `<div class="hud"><span class="pill" data-testid="qcount"></span><span class="pill" data-testid="misses"></span></div>`)}
    <div class="tip card">One try per puzzle. They get harder. Two misses and the test ends. Solve the hardest ones to jump ahead!</div><div class="pzbox"></div>`;
  function next() {
    if (k >= plan.length || misses >= 2) {
      chessReview(items); const before = unlockedTier(); S.tier = Math.max(S.tier || 1, best); if (best > tierOf(S.ladder)) S.ladder = tierStart(best); save(); noteTier();
      return finishRound(view, { title: 'Skip-ahead Test', back: 'chess', again: () => go('placement'), acc: Math.round(solved / plan.length * 100), total: plan.length, big: 'Tier ' + best,
        xp: solved * 15, lines: [['Solved', solved + '/' + plan.length], ['Your tier', TIERS[best - 1].icon + ' ' + TIERS[best - 1].name], ...(best > before ? [['Unlocked', 'Tiers up to ' + best]] : [])] });
    }
    const pz = plan[k]; $('[data-testid=qcount]', view).textContent = (k + 1) + '/' + plan.length + ' · T' + pz.d; $('[data-testid=misses]', view).textContent = '❌'.repeat(misses) + '⬜'.repeat(2 - misses);
    playPuzzle($('.pzbox', view), pz, { strict: true, onEnd(ok, ft, inf) { items.push(pzReviewItem(pz, ok, ft, inf)); if (ok) { solved++; best = Math.max(best, pz.d); solvedStats(pz); } else misses++; k++; next(); } });
  }
  next();
});

// ---------- sprint ----------
route('sprint', (view, params) => { // Puzzle Blitz: race the clock, puzzles ramp up, 3 strikes and you're out
  const mins = params.mins === 5 ? 5 : 3, hard = params.start === 'hard' || params.tier === 'pro' || params.tier === 'master';
  const r = Math.random; const by = d => POOL.filter(p => p.d === d).sort(() => r() - 0.5);
  const b1 = by(1), b2 = by(2), b3 = by(3), b4 = by(4), b5 = by(5);
  const queue = hard ? [...b3.slice(0, 3), ...b4.slice(0, 10), ...b5, ...b4.slice(10), ...b3.slice(3)]
    : [...b1.slice(0, 3), ...b2.slice(0, 4), ...b3.slice(0, 5), ...b4.slice(0, 8), ...b5, ...b4.slice(8), ...b3.slice(5), ...b2.slice(4), ...b1.slice(3)];
  const stat = sprintStat(mins, hard), key = mins === 3 && !hard ? 'sprint' : 'sprint_' + mins + 'min' + (hard ? '_hard' : '');
  const items = []; let k = 0, solved = 0, strikes = 0, end = performance.now() + mins * 60000, over = false, tick;
  view.innerHTML = `${topbar('⚡ Puzzle Blitz · ' + mins + ' min', 'chess', `<div class="hud"><span class="pill" data-testid="lives"></span><span class="pill time" data-testid="clock"></span><span class="pill score" data-testid="score">0</span></div>`)}<div class="pzbox"></div>`;
  const hud = () => { $('[data-testid=lives]', view).textContent = '❌'.repeat(strikes) + '⬜'.repeat(3 - strikes); $('[data-testid=score]', view).textContent = solved; };
  tick = setInterval(() => { const left = end - performance.now(); $('[data-testid=clock]', view).textContent = fmtTime(Math.max(0, left)); if (left <= 0) finish(); }, 200);
  onCleanup(() => clearInterval(tick));
  function finish() { if (over) return; over = true; clearInterval(tick); setMax(stat, solved); chessReview(items); finishRound(view, { key, title: 'Puzzle Blitz · ' + mins + ' min' + (hard ? ' · Hard start' : ''), back: 'chess', again: () => go('sprint', { mins, start: hard ? 'hard' : 'easy' }), score: solved, bestBy: 'score', big: solved + ' solved', acc: null, xp: solved * (hard ? 25 : 15), lines: [['Strikes', strikes + '/3'], ['Hardest solved', (() => { const t = Math.max(0, ...items.filter(i => i.ok).map(i => i.d || 0)); return t ? 'Tier ' + t : '-'; })()]] }); }
  function next() {
    if (over) return; hud(); if (strikes >= 3 || k >= queue.length) return finish();
    const pz = queue[k++]; hook.sprintPuzzle = pz;
    playPuzzle($('.pzbox', view), pz, { strict: true, onEnd(ok, ft, inf) { if (over) return; const it = pzReviewItem(pz, ok, ft, inf); it.d = pz.d; items.push(it); if (ok) { solved++; solvedStats(pz); } else { strikes++; sfx.bad(); } next(); } });
  }
  hook.sprintEnd = () => { end = performance.now(); };
  next();
});

route('rated', view => { // 10 rated puzzles picked near his rating
  const items = []; let n = 0; const start = myRating(); S.pseen = S.pseen || [];
  view.innerHTML = `${topbar('📈 Rated Puzzles', 'chess', `<div class="hud"><span class="pill" data-testid="qcount"></span><span class="pill rating" data-testid="prating">📈 ${start}</span></div>`)}<div class="pzbox"></div>`;
  function pick() {
    const R = myRating(), seen = new Set(S.pseen);
    const c = POOL.filter(p => !seen.has(p.id)).sort((a, b) => Math.abs(pzRating(a) - R) - Math.abs(pzRating(b) - R)).slice(0, 8);
    return (c.length ? c : POOL)[Math.floor(Math.random() * Math.min(8, c.length || POOL.length))];
  }
  function next() {
    if (n >= 10) {
      const end = myRating(), d = end - start; chessReview(items);
      return finishRound(view, { key: 'rated', title: 'Rated Puzzles', back: 'chess', again: () => go('rated'), score: end, bestBy: 'score', acc: Math.round(items.filter(i => i.ok).length * 10), total: 10, big: '📈 ' + end, xp: items.filter(i => i.ok).length * 15,
        lines: [['Rating', start + ' → ' + end + ' (' + (d >= 0 ? '+' : '') + d + ')'], ['Best ever', String(S.ppeak || end)]] });
    }
    const pz = pick(); hook.ratedPuzzle = { ...pz, rating: pzRating(pz) };
    S.pseen = [...S.pseen.slice(-150), pz.id];
    $('[data-testid=qcount]', view).textContent = (n + 1) + '/10';
    playPuzzle($('.pzbox', view), { ...pz, label: (THEME[pz.theme] || 'Puzzle') + ' · ' + pzRating(pz) }, { strict: true, onEnd(ok, ft, inf) {
      const d = rate(pz, ok); items.push(pzReviewItem(pz, ok, ft, inf)); if (ok) solvedStats(pz);
      const pill = $('[data-testid=prating]', view); pill.textContent = '📈 ' + myRating(); toast((d >= 0 ? '📈 +' : '📉 ') + d + ' rating'); n++; next(); } });
  }
  next();
});
