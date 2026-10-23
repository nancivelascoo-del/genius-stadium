// Play the Computer: full games against six AI opponents, from total beginner to grandmaster.
// Chess bots with ratings (styled after Chess.com's bots, our own characters). Moves come from Stockfish (engine.js):
// the top three use Stockfish's own rating limiter (UCI_Elo), the easy ones a low "Skill Level",
// plus some deliberate random moves for the first two so a beginner can win.
import { Chess } from './chess.js';
import { Board } from './chess-mode.js';
import { startEngine, bestMove, engineKind, stopEngine } from './engine.js';
import { S, save, $, $$, esc, sfx, toast, route, go, topbar, hook, bump, onCleanup, confetti, TEST } from './core.js';
import { finishRound } from './quiz.js';

export const OPPONENTS = [
  { id: 'chick', name: 'Chick Pea', e: '🐣', bg: '#ffd166', lvl: 'Beginner', rating: 400, stars: 1, hi: 'Hi! I just learned how the horsey moves!', win: 'Peep peep! I won?!', lose: 'Peep! You got me!',
    cfg: { skill: 0, depth: 1, random: 0.5, miniDepth: 1 }, undo: true, hints: Infinity },
  { id: 'turtle', name: 'Turbo Turtle', e: '🐢', bg: '#06d6a0', lvl: 'Easy', rating: 700, stars: 2, hi: 'Slow and steady… but I sometimes forget my queen.', win: 'Slow and steady wins the race!', lose: 'Whoa, you were too fast for me!',
    cfg: { skill: 1, depth: 2, random: 0.2, miniDepth: 1 }, undo: true, hints: Infinity },
  { id: 'fox', name: 'Foxy Fork', e: '🦊', bg: '#f78c6b', lvl: 'Medium', rating: 1000, stars: 3, hi: 'Careful! I LOVE sneaky forks.', win: 'Forked you! Hehe.', lose: 'You out-foxed the fox!',
    cfg: { skill: 5, depth: 5, miniDepth: 2 }, undo: true, hints: 5 },
  { id: 'owl', name: 'Professor Hoot', e: '🦉', bg: '#b388ff', lvl: 'Hard', rating: 1350, stars: 4, hi: 'Hoo-hoo! I have read every chess book.', win: 'A fine lesson. Study and return!', lose: 'Remarkable! Top marks!',
    cfg: { elo: 1350, movetime: 700, miniDepth: 2 }, undo: false, hints: 3 },
  { id: 'dragon', name: 'Blaze the Dragon', e: '🐉', bg: '#ef476f', lvl: 'Expert', rating: 1700, stars: 5, hi: 'I breathe tactics. Only the brave play me!', win: 'ROAR! Burnt to a crisp!', lose: 'You… beat a DRAGON?!',
    cfg: { elo: 1700, movetime: 900, miniDepth: 3 }, undo: false, hints: 0 },
  { id: 'bolt', name: 'Grandmaster Bolt', e: '🤖', bg: '#4cc9f0', lvl: 'Master', rating: 2000, stars: 6, hi: 'Calculating millions of moves… ready.', win: 'Checkmate. Calculated.', lose: 'ERROR: does not compute. You WON!',
    cfg: { elo: 2000, movetime: 1200, miniDepth: 3 }, undo: false, hints: 0 },
];
const oppById = id => OPPONENTS.find(o => o.id === id) || OPPONENTS[0];
const rec = id => (S.vs && S.vs[id]) || { w: 0, l: 0, d: 0 };
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
function upNext() { const i = OPPONENTS.findIndex(o => !rec(o.id).w); return i < 0 ? OPPONENTS.length - 1 : i; }

route('vs', view => {
  startEngine(); // warm up while he picks
  const color = S.seen.vsColor || 'w'; const next = upNext(); const g = S.vsGame;
  view.innerHTML = `${topbar('🤖 Play the Bots', 'chess')}
  ${g ? `<button class="card resume" data-testid="vs-resume"><span class="ava sm" style="background:${oppById(g.opp).bg}">${oppById(g.opp).e}</span><b>Continue your game vs ${esc(oppById(g.opp).name)}</b><span>›</span></button>` : ''}
  <h2 class="sec">You play</h2>
  <div class="chips" data-testid="vs-color">${[['w', '⚪ White'], ['b', '⚫ Black'], ['r', '🎲 Random']].map(([k, n]) => `<button class="chip ${k === color ? 'on' : ''}" data-c="${k}" data-testid="color-${k}">${n}</button>`).join('')}</div>
  <h2 class="sec">Pick your opponent</h2>
  <div class="opps">${OPPONENTS.map((o, i) => { const r = rec(o.id); return `<button class="opp card ${i === next ? 'next' : ''} ${r.w ? 'beaten' : ''}" data-o="${o.id}" data-testid="opp">
    <span class="ava" style="background:${o.bg}">${o.e}</span><b>${esc(o.name)}</b><span class="orating" data-testid="opp-rating">${o.rating}</span><small>${o.lvl} · <span class="str">${'★'.repeat(o.stars)}${'☆'.repeat(6 - o.stars)}</span></small>
    <small class="recd">${r.w || r.l || r.d ? `🏆 ${r.w} &nbsp;🤝 ${r.d} &nbsp;❌ ${r.l}` : i === next ? '👉 Up next' : 'Not played yet'}</small>
    <small class="helps">${o.undo ? '↩️ Undo ' : ''}${o.hints ? '💡 Hints' : ''}${!o.undo && !o.hints ? '🔥 No help' : ''}</small></button>`; }).join('')}</div>`;
  $$('[data-c]', view).forEach(b => b.onclick = () => { S.seen.vsColor = b.dataset.c; save(); sfx.tap(); go('vs'); });
  $$('[data-o]', view).forEach(b => b.onclick = () => { sfx.tap(); const c = S.seen.vsColor || 'w'; go('vsgame', { opp: b.dataset.o, color: c === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : c }); });
  const rb = $('[data-testid=vs-resume]', view); if (rb) rb.onclick = () => { sfx.tap(); go('vsgame', { resume: true }); };
});

route('vsgame', (view, params) => {
  let G;
  if (params.resume && S.vsGame) G = S.vsGame;
  else { G = { opp: params.opp || 'chick', color: params.color === 'b' ? 'b' : 'w', fen0: (TEST && params.fen) || START, moves: [], hintsUsed: 0 }; S.vsGame = G; save(); }
  const O = oppById(G.opp); let over = false, thinking = false, token = 0, resignArmed = false, left = false;
  view.innerHTML = `${topbar(`${O.e} vs ${esc(O.name)}`, 'vs', `<div class="hud"><span class="pill" data-testid="movecount">Move 1</span></div>`)}
  <div class="vsbox">
    <div class="oppbar"><span class="ava sm" style="background:${O.bg}">${O.e}</span><span class="oname"><b>${esc(O.name)}</b> <span class="orating">(${O.rating})</span></span><div class="bubble" data-testid="bubble">${esc(O.hi)}</div><span class="think" data-testid="thinking" hidden>thinking<i>.</i><i>.</i><i>.</i></span></div>
    <div class="bbox"></div>
    <div class="pmsg show" data-testid="status"></div>
    <div class="row pbtns">
      ${O.undo ? '<button class="btn" data-testid="undo">↩️ Undo</button>' : ''}
      ${O.hints ? `<button class="btn" data-testid="vhint">💡 Hint${O.hints < 99 ? ` <small data-testid="hintsleft"></small>` : ''}</button>` : ''}
      <button class="btn" data-testid="resign">🏳️ Resign</button>
    </div>
  </div>`;
  const board = Board($('.bbox', view), G.fen0, userMove, { orient: G.color });
  for (const m of G.moves) { try { board.play(m, true); } catch (e) { break; } }
  const ch = board.chess, status = $('[data-testid=status]', view), bubble = $('[data-testid=bubble]', view), think = $('[data-testid=thinking]', view);
  const say = (t, cls = '') => { status.className = 'pmsg show ' + cls; status.textContent = t; };
  const hud = () => {
    $('[data-testid=movecount]', view).textContent = 'Move ' + (Math.floor(G.moves.length / 2) + 1);
    const hl = $('[data-testid=hintsleft]', view); if (hl) hl.textContent = '(' + Math.max(0, O.hints - G.hintsUsed) + ')';
    const ub = $('[data-testid=undo]', view); if (ub) ub.disabled = thinking || over || !undoCount();
    const hb = $('[data-testid=vhint]', view); if (hb) hb.disabled = thinking || over || ch.turn() !== G.color || G.hintsUsed >= O.hints;
  };
  const undoCount = () => { const n = G.moves.length; if (!n) return 0; const lastByMe = (ch.turn() !== G.color); return lastByMe ? 1 : (n >= 2 ? 2 : 0); };
  function turnMsg() { if (over) return; if (ch.turn() === G.color) say(ch.inCheck() ? '⚠️ Check! Save your king.' : 'Your move', ch.inCheck() ? 'no' : ''); }
  hook.vs = () => ({ turn: ch.turn(), color: G.color, over, thinking, moves: G.moves.slice(), fen: ch.fen(), result: G.result || null, engine: engineKind() });
  hook.board = board;
  onCleanup(() => { left = true; token++; stopEngine(); });

  function endCheck() {
    if (!ch.isGameOver()) return false;
    let result, why;
    if (ch.isCheckmate()) { result = ch.turn() === G.color ? 'loss' : 'win'; why = 'Checkmate!'; }
    else { result = 'draw'; why = ch.isStalemate() ? 'Stalemate! No legal moves, but no check: it\'s a draw.' : ch.isThreefoldRepetition() ? 'Same position 3 times: draw.' : ch.isInsufficientMaterial() ? 'Not enough pieces left to checkmate: draw.' : '50 moves with no capture or pawn move: draw.'; }
    finish(result, why); return true;
  }
  function finish(result, why) {
    if (over) return; over = true; board.lock(true); G.result = result;
    S.vs = S.vs || {}; const r = rec(G.opp); r[result === 'win' ? 'w' : result === 'loss' ? 'l' : 'd']++; S.vs[G.opp] = r; S.vsGame = null; save();
    if (result === 'win') { bump('vsWins'); bump('vswin_' + G.opp); confetti(80); sfx.win(); bubble.textContent = O.lose; }
    else if (result === 'loss') { sfx.bad(); bubble.textContent = O.win; } else bubble.textContent = 'A draw! Good fight.';
    say((result === 'win' ? '🏆 You win! ' : result === 'loss' ? '❌ You lost. ' : '🤝 ') + why, result === 'win' ? 'ok' : result === 'loss' ? 'no' : '');
    hud(); const idx = OPPONENTS.indexOf(O);
    const t = setTimeout(() => { if (left) return; finishRound(view, { title: `${O.e} vs ${O.name}`, back: 'vs', again: () => go('vsgame', { opp: G.opp, color: G.color, fen: params.fen }), acc: result === 'win' ? 100 : result === 'draw' ? 70 : 0, total: 1,
      big: result === 'win' ? 'You won!' : result === 'draw' ? 'Draw' : 'Good try!', xp: result === 'win' ? 40 + idx * 30 : result === 'draw' ? 15 + idx * 10 : 10,
      lines: [['Result', why.replace(/!.*/, '!')], ['Moves', String(Math.ceil(G.moves.length / 2))], ['Your record vs ' + O.name, `${r.w}W ${r.d}D ${r.l}L`], ...(result === 'win' && idx < OPPONENTS.length - 1 && r.w === 1 ? [['Next challenger', OPPONENTS[idx + 1].e + ' ' + OPPONENTS[idx + 1].name]] : [])] }); }, 2200);
    onCleanup(() => clearTimeout(t));
  }
  function record(uci) { G.moves.push(uci); save(); }
  function userMove(uci, isPromo) {
    if (over || thinking || ch.turn() !== G.color) return;
    if (isPromo) return promoPick(p => { board.play(uci + p); record(uci + p); afterUser(); });
    board.play(uci); record(uci); afterUser();
  }
  function afterUser() { resetResign(); hud(); if (endCheck()) return; engineMove(); }
  function promoPick(cb) {
    const m = document.createElement('div'); m.className = 'modal'; m.dataset.testid = 'promo';
    const c = G.color; m.innerHTML = `<div class="card pop center"><h2>Promote to…</h2><div class="row">${['q', 'r', 'b', 'n'].map(p => `<button class="btn big promo" data-p="${p}" data-testid="promo-${p}">${{ q: c === 'w' ? '♕' : '♛', r: c === 'w' ? '♖' : '♜', b: c === 'w' ? '♗' : '♝', n: c === 'w' ? '♘' : '♞' }[p]}</button>`).join('')}</div></div>`;
    document.body.appendChild(m); $$('[data-p]', m).forEach(b => b.onclick = () => { m.remove(); cb(b.dataset.p); });
  }
  async function engineMove() {
    if (over || ch.turn() === G.color) return;
    const my = ++token; thinking = true; think.hidden = false; board.lock(true); say(O.name + ' is thinking…'); hud();
    const fen = ch.fen(); const t0 = performance.now(); let move = null;
    try {
      if (O.cfg.random && Math.random() < O.cfg.random) { const ms = ch.moves({ verbose: true }); const m = ms[Math.floor(Math.random() * ms.length)]; move = m.from + m.to + (m.promotion || ''); }
      else move = (await bestMove(fen, O.cfg)).move;
    } catch (e) { move = null; }
    if (!move) { const ms = ch.moves({ verbose: true }); if (ms.length) move = ms[0].from + ms[0].to + (ms[0].promotion || ''); }
    const wait = Math.max(0, (TEST ? 150 : 650) - (performance.now() - t0)); await new Promise(r => setTimeout(r, wait));
    if (my !== token || left || over || ch.fen() !== fen) return;
    thinking = false; think.hidden = true;
    const m = board.play(move); record(m.from + m.to + (m.promotion || ''));
    if (m.captured && Math.random() < 0.5) bubble.textContent = ['Yum, I took your ' + PN[m.captured] + '!', 'Got one!', 'Thanks for the ' + PN[m.captured] + '!'][Math.floor(Math.random() * 3)];
    else if (ch.inCheck()) bubble.textContent = 'Check!';
    board.lock(false); hud(); if (endCheck()) return; turnMsg();
  }
  const PN = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };
  const ub = $('[data-testid=undo]', view);
  if (ub) ub.onclick = () => { const n = undoCount(); if (!n || thinking || over) return; sfx.tap(); for (let i = 0; i < n; i++) { board.undo(); G.moves.pop(); } save(); bump('undos'); board.lock(false); bubble.textContent = 'Take-back? OK, just this once… 😉'; hud(); turnMsg(); };
  const hb = $('[data-testid=vhint]', view);
  if (hb) hb.onclick = async () => {
    if (thinking || over || ch.turn() !== G.color || G.hintsUsed >= O.hints) return; sfx.tap(); G.hintsUsed++; save(); hud();
    const fen = ch.fen(); hb.disabled = true; say('💡 Thinking of a good move…');
    const r = await bestMove(fen, { skill: 20, depth: 10, miniDepth: 2 }); if (left || ch.fen() !== fen || !r.move) return;
    board.hint([r.move.slice(0, 2), r.move.slice(2, 4)]); say('💡 Try moving the highlighted piece', 'ok'); hud();
  };
  const rs = $('[data-testid=resign]', view);
  function resetResign() { resignArmed = false; rs.textContent = '🏳️ Resign'; rs.classList.remove('danger'); }
  rs.onclick = () => { if (over) return; if (!resignArmed) { resignArmed = true; rs.textContent = 'Tap again to resign'; rs.classList.add('danger'); return; } finish('loss', 'You resigned.'); };
  hud();
  if (!endCheck()) { if (ch.turn() !== G.color) engineMove(); else turnMsg(); }
});
