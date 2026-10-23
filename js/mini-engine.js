// Backup engine, used only if Stockfish (WebAssembly) can't start. Small alpha-beta search with
// material + piece-square scores. Weak, but always plays a legal, sensible move.
import { Chess } from './chess.js';
const V = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const CENTER = [0, 1, 2, 3, 3, 2, 1, 0];
function evalBoard(ch) { // from white's point of view
  let s = 0; const b = ch.board();
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) { const p = b[r][f]; if (!p) continue;
    let v = V[p.type];
    if (p.type === 'n' || p.type === 'b') v += (CENTER[r] + CENTER[f]) * 5;
    if (p.type === 'p') v += (p.color === 'w' ? 6 - r : r - 1) * 8 + (CENTER[f] > 1 ? 6 : 0);
    s += p.color === 'w' ? v : -v; }
  return s;
}
function search(ch, depth, alpha, beta) {
  if (ch.isCheckmate()) return -100000 - depth;
  if (ch.isDraw() || ch.isStalemate()) return 0;
  if (depth === 0) return (ch.turn() === 'w' ? 1 : -1) * evalBoard(ch);
  const moves = ch.moves({ verbose: true }).sort((a, b) => (b.captured ? V[b.captured] : 0) - (a.captured ? V[a.captured] : 0));
  for (const m of moves) { ch.move(m); const sc = -search(ch, depth - 1, -beta, -alpha); ch.undo(); if (sc >= beta) return beta; if (sc > alpha) alpha = sc; }
  return alpha;
}
export function miniBestMove(fen, depth = 2) {
  const ch = new Chess(fen); let best = null, bestSc = -Infinity;
  const moves = ch.moves({ verbose: true }).sort(() => Math.random() - 0.5);
  for (const m of moves) { ch.move(m); const sc = -search(ch, depth - 1, -Infinity, -bestSc); ch.undo(); if (sc > bestSc) { bestSc = sc; best = m; } }
  return best ? best.from + best.to + (best.promotion || '') : null;
}
