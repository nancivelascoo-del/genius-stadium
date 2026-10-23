// Chess engine for "Play the Computer". Stockfish 18 (lite, single-threaded WASM, GPLv3) runs in a Web Worker,
// so the page never freezes and it works offline (the service worker caches engine/*).
// If WebAssembly or workers are not available, a small built-in engine (mini-engine.js) plays instead.
import { miniBestMove } from './mini-engine.js';

let worker = null, kind = null, starting = null, lines = [], busy = Promise.resolve();
const listeners = new Set();
function send(c) { worker.postMessage(c); }
function waitFor(pred, ms = 20000) {
  return new Promise((res, rej) => {
    const f = l => { if (pred(l)) { listeners.delete(f); clearTimeout(t); res(l); } };
    const t = setTimeout(() => { listeners.delete(f); rej(new Error('engine timeout')); }, ms);
    listeners.add(f);
  });
}
export function engineKind() { return kind; }
export function startEngine() {
  if (starting) return starting;
  starting = (async () => {
    try {
      if (typeof WebAssembly !== 'object' || typeof Worker !== 'function' || /[?&]noengine\b/.test(location.search)) throw new Error('no wasm');
      worker = new Worker('engine/stockfish-18-lite-single.js');
      worker.onmessage = e => { const l = String(e.data); for (const f of [...listeners]) f(l); };
      worker.onerror = e => { for (const f of [...listeners]) f('__error__'); };
      send('uci'); const r = await waitFor(l => l === 'uciok' || l === '__error__', 25000); if (r === '__error__') throw new Error('worker error');
      send('isready'); await waitFor(l => l === 'readyok');
      kind = 'stockfish';
    } catch (e) {
      try { if (worker) worker.terminate(); } catch (x) { /* ignore */ }
      worker = null; kind = 'mini';
    }
    return kind;
  })();
  return starting;
}
// cfg: {skill 0-20 | elo 1320-3190 (Stockfish's rating limiter), depth, movetime}. Returns {move:'e2e4', kind}
export function bestMove(fen, cfg = {}) {
  const job = busy.then(async () => {
    await startEngine();
    if (kind !== 'stockfish') return { move: miniBestMove(fen, cfg.miniDepth || 2), kind };
    send('ucinewgame'); send('setoption name UCI_LimitStrength value ' + (cfg.elo ? 'true' : 'false')); if (cfg.elo) send('setoption name UCI_Elo value ' + cfg.elo); else send('setoption name Skill Level value ' + (cfg.skill ?? 20)); send('isready'); await waitFor(l => l === 'readyok');
    send('position fen ' + fen);
    send('go' + (cfg.depth ? ' depth ' + cfg.depth : '') + (cfg.movetime ? ' movetime ' + cfg.movetime : ''));
    const l = await waitFor(x => x.startsWith('bestmove'), 30000);
    const m = l.split(' ')[1];
    return { move: m && m !== '(none)' ? m : null, kind };
  });
  busy = job.catch(() => {});
  return job;
}
export function stopEngine() { if (worker && kind === 'stockfish') send('stop'); }
