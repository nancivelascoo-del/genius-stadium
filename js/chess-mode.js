// Chess Lab: lessons, puzzle ladder, tactic sprint. Moves validated with chess.js.
import { Chess } from './chess.js';
import { PIECES, PIECE_VB } from './pieces.js';
import { LESSONS, POOL } from './puzzles.js';
import { S, save, $, $$, esc, sfx, toast, seeded, fmtTime, route, go, topbar, hook, bump, setMax, onCleanup, confetti, addXP } from './core.js';
import { finishRound, levelUp } from './quiz.js';

const THEME = { mate1: 'Mate in 1', mate2: 'Mate in 2', fork: 'Win material', win: 'Win material' };
const FILES = 'abcdefgh';
function pieceSvg(p) {
  const c = p.color, t = p.type;
  if (c === 'w') return `<svg viewBox="${PIECE_VB}" class="pc"><g transform="scale(1,1)"><path d="${PIECES['b' + t]}" fill="#fff"/><path d="${PIECES['w' + t]}" fill="#1d1d1d"/></g></svg>`;
  return `<svg viewBox="${PIECE_VB}" class="pc"><path d="${PIECES['w' + t]}" fill="#1d1d1d" stroke="#1d1d1d" stroke-width="40"/><path d="${PIECES['b' + t]}" fill="#1d1d1d"/></svg>`;
}

route('chess', view => {
  const done = Object.keys(S.lessons).filter(k => S.lessons[k] && S.lessons[k].done).length;
  const ladder = ladderOrder(); const rung = S.ladder % ladder.length;
  view.innerHTML = `${topbar('♟️ Chess Lab')}
  <div class="modes">
    <div class="mode card wide"><div class="mi">🪜</div><h3>Puzzle Ladder</h3><p>Climb from mate-in-1 to mate-in-2. You're on rung <b data-testid="rung">${S.ladder + 1}</b>.</p><button class="btn primary big" data-testid="ladder">Climb (5 puzzles)</button></div>
    <div class="mode card"><div class="mi">⏱️</div><h3>Tactic Sprint</h3><p>3 minutes. 3 lives. How many can you solve?</p><button class="btn primary" data-testid="sprint">Start sprint</button><small>${S.stats.bestSprint ? 'Best ' + S.stats.bestSprint + ' solved' : 'No best yet'}</small></div>
  </div>
  <h2 class="sec">Lessons <small>${done}/${LESSONS.length}</small></h2>
  <div class="lessons">${LESSONS.map(l => { const st = S.lessons[l.id] || {}; return `<button class="lesson card ${st.done ? 'done' : ''}" data-l="${l.id}" data-testid="lesson"><span class="li">${l.icon}</span><b>${esc(l.title)}</b><small>${st.done ? '✅ ' + '★'.repeat(st.stars || 0) : l.puzzles.length + ' puzzles'}</small></button>`; }).join('')}</div>`;
  $$('[data-l]', view).forEach(b => b.onclick = () => { sfx.tap(); go('lesson', { id: b.dataset.l }); });
  $('[data-testid=ladder]', view).onclick = () => { sfx.tap(); go('ladder'); };
  $('[data-testid=sprint]', view).onclick = () => { sfx.tap(); go('sprint'); };
});
function ladderOrder() {
  const r = seeded(7); const sh = a => a.map(x => [r(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  return [...sh(POOL.filter(p => p.d === 1)), ...sh(POOL.filter(p => p.d === 2)), ...sh(POOL.filter(p => p.d === 3))];
}

// ---------- board ----------
export function Board(box, fen, onUserMove) {
  const chess = new Chess(fen); const orient = chess.turn(); let sel = null, last = null, locked = false, hintSq = null;
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
    if (hintSq) sqEl(hintSq).classList.add('hint');
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
    play(uci) { const m = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || 'q' }); last = { from: m.from, to: m.to }; hintSq = null; sfx.move(); draw(); return m; },
    undo() { chess.undo(); const h = chess.history({ verbose: true }); const m = h[h.length - 1]; last = m ? { from: m.from, to: m.to } : null; draw(); },
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
  box.innerHTML = `<div class="ptop"><span class="turn" data-testid="turn"></span><span class="theme">${THEME[pz.theme] || (pz.mate ? (pz.line.length > 1 ? 'Mate in 2' : 'Mate in 1') : 'Win material')}</span></div><div class="bbox"></div>
    <div class="pmsg" data-testid="pmsg"></div><div class="row pbtns"><button class="btn" data-testid="hint">💡 Hint</button>${cfg.strict ? '' : '<button class="btn" data-testid="show">👀 Show me</button>'}</div>`;
  let ply = 0, wrongs = 0, ended = false, usedHint = false; const line = pz.line.slice();
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
  function win() { ended = true; board.lock(true); const first = wrongs === 0 && !usedHint; say(first ? '✓ Solved! Brilliant!' : '✓ Solved!', 'ok'); if (board.chess.isCheckmate()) confetti(20); setTimeout(() => cfg.onEnd(true, first), 900); }
  function reveal(solved) {
    ended = true; board.lock(true); let k = ply; const step = () => { if (k >= pz.line.length || line[k] === 'mate') { setTimeout(() => cfg.onEnd(solved, false), 900); return; } try { board.play(pz.line[k]); } catch (e) { /* line diverged */ } k++; setTimeout(step, 650); };
    say(cfg.strict ? '✗ The answer was…' : 'Watch the answer…', 'no'); setTimeout(step, 400);
  }
  $('[data-testid=hint]', box).onclick = () => { if (ended) return; usedHint = true; const exp = line[ply] === 'mate' ? null : line[ply]; if (exp) board.hint(exp.slice(0, 2)); else say('Look for checkmate!', 'ok'); if (cfg.strict) cfg.onHint && cfg.onHint(); };
  const sb = $('[data-testid=show]', box); if (sb) sb.onclick = () => { if (!ended) { wrongs = 2; reveal(false); } };
  return board;
}

// ---------- lesson ----------
route('lesson', (view, { id }) => {
  const L = LESSONS.find(l => l.id === id); let i = 0, first = 0;
  view.innerHTML = `${topbar(L.icon + ' ' + esc(L.title), 'chess', `<div class="hud"><span class="pill" data-testid="qcount"></span></div>`)}
    <div class="tip card" data-testid="tip">💡 ${esc(L.tip)}</div><div class="pzbox"></div>`;
  function next() {
    if (i >= L.puzzles.length) {
      const stars = first === L.puzzles.length ? 3 : first >= L.puzzles.length - 1 ? 2 : 1; const was = S.lessons[id] && S.lessons[id].done;
      S.lessons[id] = { done: true, stars: Math.max(stars, (S.lessons[id] && S.lessons[id].stars) || 0) }; save();
      S.stats.lessonsDone = Object.values(S.lessons).filter(x => x.done).length; save();
      const acc = Math.round(first / L.puzzles.length * 100);
      return finishRound(view, { title: L.title, back: 'chess', again: () => go('lesson', { id }), acc, total: L.puzzles.length, big: first + '/' + L.puzzles.length, xp: first * 20 + (was ? 0 : 40), lines: [['Solved first try', first + '/' + L.puzzles.length]] });
    }
    $('[data-testid=qcount]', view).textContent = (i + 1) + '/' + L.puzzles.length;
    const pz = L.puzzles[i];
    playPuzzle($('.pzbox', view), pz, { onEnd(ok, ft) { if (ft) first++; if (ok && pz.mate) bump('mates'); i++; next(); } });
  }
  next();
});

// ---------- ladder ----------
route('ladder', view => {
  const order = ladderOrder(); let n = 0, first = 0, solved = 0;
  view.innerHTML = `${topbar('🪜 Puzzle Ladder', 'chess', `<div class="hud"><span class="pill" data-testid="qcount"></span><span class="pill" data-testid="rungpill"></span></div>`)}<div class="pzbox"></div>`;
  function next() {
    if (n >= 5) { const acc = Math.round(first / 5 * 100); return finishRound(view, { title: 'Puzzle Ladder', back: 'chess', again: () => go('ladder'), acc, total: 5, big: solved + '/5', xp: first * 18 + solved * 6, lines: [['First-try solves', first + '/5'], ['Now on rung', String(S.ladder + 1)]] }); }
    const pz = order[S.ladder % order.length];
    $('[data-testid=qcount]', view).textContent = (n + 1) + '/5'; $('[data-testid=rungpill]', view).textContent = 'Rung ' + (S.ladder + 1);
    playPuzzle($('.pzbox', view), pz, { onEnd(ok, ft) { if (ft) first++; if (ok) { solved++; if (pz.mate) bump('mates'); if (pz.theme === 'mate2') bump('mate2'); } S.ladder++; save(); n++; next(); } });
  }
  next();
});

// ---------- sprint ----------
route('sprint', view => {
  const r = Math.random; const by = d => POOL.filter(p => p.d === d).sort(() => r() - 0.5);
  const queue = [...by(1).slice(0, 6), ...by(2).slice(0, 10), ...by(1).slice(6), ...by(3), ...by(2).slice(10)];
  let k = 0, solved = 0, lives = 3, end = performance.now() + 180000, over = false, tick;
  view.innerHTML = `${topbar('⏱️ Tactic Sprint', 'chess', `<div class="hud"><span class="pill" data-testid="lives"></span><span class="pill time" data-testid="clock"></span><span class="pill score" data-testid="score">0</span></div>`)}<div class="pzbox"></div>`;
  const hud = () => { $('[data-testid=lives]', view).textContent = '❤️'.repeat(lives) + '🖤'.repeat(3 - lives); $('[data-testid=score]', view).textContent = solved; };
  tick = setInterval(() => { const left = end - performance.now(); $('[data-testid=clock]', view).textContent = fmtTime(Math.max(0, left)); if (left <= 0) finish(); }, 200);
  onCleanup(() => clearInterval(tick));
  function finish() { if (over) return; over = true; clearInterval(tick); setMax('bestSprint', solved); finishRound(view, { key: 'sprint', title: 'Tactic Sprint', back: 'chess', again: () => go('sprint'), score: solved, bestBy: 'score', big: solved + ' solved', acc: null, xp: solved * 15, lines: [['Lives left', String(lives)]] }); }
  function next() {
    if (over) return; hud(); if (lives <= 0 || k >= queue.length) return finish();
    const pz = queue[k++];
    playPuzzle($('.pzbox', view), pz, { strict: true, onEnd(ok) { if (over) return; if (ok) { solved++; if (pz.mate) bump('mates'); if (pz.theme === 'mate2') bump('mate2'); } else lives--; next(); } });
  }
  hook.sprintEnd = () => { end = performance.now(); };
  next();
});
