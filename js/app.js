// App shell: home, daily challenge, trophies. Registers the offline service worker.
import { S, save, resetAll, $, $$, esc, sfx, toast, shuffle, seeded, today, dayNumber, fmtTime, route, go, topbar, hook, bump, levelFor, titleFor, streakAlive, BADGES, missedCount, checkBadges, TEST } from './core.js';
import { GEO } from '../data/geo.js';
import { FACTS, FIBS, SOCCER } from './content.js';
import { POOL } from './puzzles.js';
import { runQuiz, finishRound, mc, setReview } from './quiz.js';
import { flagImg, LEVELS } from './geo-mode.js';
import { playPuzzle, pzReviewItem } from './chess-mode.js';
import { factOfDay } from './facts-mode.js';
import './play-mode.js';
import './chesscom.js';
import { DOODLE, WOBBLE } from './doodles.js';

function muteBtn() { return `<button class="iconbtn" data-testid="mute" aria-label="${S.muted ? 'Sound off' : 'Sound on'}">${S.muted ? '🔇' : '🔊'}</button>`; }
function wireMute(view) { const b = $('[data-testid=mute]', view); if (b) b.onclick = () => { S.muted = !S.muted; save(); b.textContent = S.muted ? '🔇' : '🔊'; b.setAttribute('aria-label', S.muted ? 'Sound off' : 'Sound on'); sfx.tap(); }; }

route('home', view => {
  const L = levelFor(S.xp); const st = streakAlive(); const dailyDone = S.daily.date === today() && S.daily.done; const miss = missedCount();
  view.innerHTML = `${WOBBLE}
  <div class="doodles-bg" aria-hidden="true">${DOODLE.star('d1')}${DOODLE.squiggle('d2')}${DOODLE.star('d3')}${DOODLE.arrow('d4')}</div>
  <header class="homebar">
    <div class="brand"><img class="logo" src="icons/icon-192.png" alt="" width="64" height="64"><div><h1 data-testid="app-name">Brainiac FunZone</h1><small data-testid="title">Level ${L.lvl} · ${esc(titleFor(L.lvl))}</small></div></div>
    <div class="row"><span class="pill streak ${st ? 'on' : ''}" data-testid="streak" title="Day streak">🔥 ${st}${S.streak.shields ? ' 🛡️' + S.streak.shields : ''}</span>${muteBtn()}</div>
  </header>
  <div class="xpbar" data-testid="xpbar"><i style="width:${Math.round(L.into / L.need * 100)}%"></i><span>${L.into} / ${L.need} XP to level ${L.lvl + 1}</span></div>
  <button class="daily card ${dailyDone ? 'done' : ''}" data-testid="go-daily"><span class="big">${DOODLE.cal()}</span><div><b>Daily Challenge</b><small>${dailyDone ? 'Done for today! Come back tomorrow.' : '5 quick questions + puzzle of the day. Keep your streak!'}</small></div><span class="arrow">›</span></button>
  <div class="tiles">
    <button class="tile geo" data-testid="go-geo"><span>${DOODLE.globe()}</span><b>Geo Arena</b><small>Maps · Flags · Capitals</small></button>
    <button class="tile chess" data-testid="go-chess"><span>${DOODLE.pawn()}</span><b>Chess Lab</b><small>Blitz · Rated puzzles · Bots</small></button>
    <button class="tile soccer" data-testid="go-soccer"><span>${DOODLE.ball()}</span><b>Soccer Stadium</b><small>Shootout · Trivia</small></button>
    <button class="tile facts" data-testid="go-facts"><span>${DOODLE.bulb()}</span><b>Fact Lab</b><small>Fact or Fib · Vault</small></button>
  </div>
  <div class="row homefoot">
    <button class="btn" data-testid="go-trophies">${DOODLE.trophy('inl')} Trophies <small>${Object.keys(S.badges).length}/${BADGES.length}</small></button>
    ${miss ? `<span class="pill" data-testid="rematch">♻️ ${miss} to rematch</span>` : ''}
  </div>`;
  wireMute(view);
  for (const s of ['daily', 'geo', 'chess', 'soccer', 'facts', 'trophies']) $(`[data-testid=go-${s}]`, view).onclick = () => { sfx.tap(); go(s); };
});

// ---------- daily ----------
function dailyQuestions(hard) {
  const r = seeded(dayNumber() * 7919 + (hard ? 17 : 0)); const pick = a => a[Math.floor(r() * a.length)];
  const C = GEO.countries; const ids = Object.keys(C).filter(id => hard ? C[id].t === 3 : C[id].t <= 2); const capIds = ids.filter(id => C[id].cap);
  const others = (id, list, f) => { const o = []; while (o.length < 3) { const x = pick(list); if (x !== id && !o.includes(f(x)) && f(x) !== f(id)) o.push(f(x)); } return o; };
  const fl = pick(ids), cp = pick(capIds), so = pick(SOCCER.filter(s => hard ? s.t >= 3 : s.t <= 2)), fa = pick(FACTS.filter(f => hard ? f.t === 3 : !f.t)), fb = pick(FIBS.filter(f => hard ? f.t === 3 : !f.t));
  const order = (q) => q; // mc() shuffles choices
  return [
    order({ ...mc('Which country has this flag?', C[fl].n, others(fl, ids, x => C[x].n)), img: flagImg(fl, 'bigflag'), why: C[fl].n }),
    { ...mc('Capital of <b>' + esc(C[cp].n) + '</b>?', C[cp].cap, others(cp, capIds, x => C[x].cap)), why: C[cp].cap + ' is the capital of ' + C[cp].n + '.' },
    { ...mc(esc(so.q), so.a, so.w), why: so.why },
    { ...mc(`<span class="qemoji">${fa.e}</span>${esc(fa.q)}`, fa.a, fa.w), why: fa.why },
    { prompt: 'Fact or Fib?<br><span class="tfq">' + esc(fb.s) + '</span>', choices: ['✓ Fact', '✗ Fib'], answer: fb.f ? 0 : 1, tf: true, why: fb.why },
  ];
}
export function puzzleOfDay(hard) { const d1 = POOL.filter(p => hard ? p.d >= 4 : p.d <= 2); return d1[dayNumber() % d1.length]; }
route('daily', view => {
  const done = S.daily.date === today() && S.daily.done; const fi = factOfDay(); const hard = !!S.seen.dailyHard;
  view.innerHTML = `${topbar('📅 Daily Challenge')}
  <p class="center muted">${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} · 🔥 ${streakAlive()} day streak</p>
  <div class="diffbar"><span>Difficulty</span><div class="chips small" data-testid="difficulty"><button class="chip ${hard ? '' : 'on'}" data-h="0" data-testid="daily-normal">Normal</button><button class="chip ${hard ? 'on' : ''}" data-h="1" data-testid="daily-hard">🔥 Hard</button></div></div>
  <p class="diffnote" data-testid="diffnote">${hard ? '🔴 Hard: rare flags and capitals, expert soccer, tough facts, and a Pro or Master chess puzzle. Less time!' : '🟢 Normal: a fun mix for everyone.'}</p>
  <div class="modes">
    <div class="mode card wide"><div class="mi">🎯</div><h3>Daily Mix</h3><p>Flag, capital, soccer, fact, and Fact or Fib. Same 5 for everyone today.</p>
      ${done ? `<p class="okline" data-testid="daily-score">✅ Done! Score ${S.daily.score.toLocaleString()}</p><button class="btn" data-testid="daily-play">Play again (just for fun)</button>` : '<button class="btn primary big" data-testid="daily-play">Start</button>'}</div>
    <div class="mode card"><div class="mi">♟️</div><h3>Puzzle of the Day</h3><p>One chess puzzle, fresh every day.</p><button class="btn primary" data-testid="potd">Solve it</button><small>${S.seen.potd === dayNumber() ? '✅ Solved today' : ''}</small></div>
    <div class="mode card"><div class="mi">${FACTS[fi].e}</div><h3>Fact of the Day</h3><p>${esc(FACTS[fi].q)}</p><button class="btn" data-testid="daily-fotd">Find out</button></div>
  </div>`;
  $$('.chip[data-h]', view).forEach(b => b.onclick = () => { S.seen.dailyHard = b.dataset.h === '1'; save(); sfx.tap(); go('daily'); });
  $('[data-testid=daily-play]', view).onclick = () => { sfx.tap(); go('dailymix'); };
  $('[data-testid=potd]', view).onclick = () => { sfx.tap(); go('potd'); };
  $('[data-testid=daily-fotd]', view).onclick = () => { sfx.tap(); go('fotd', { back: 'daily' }); };
});
route('dailymix', view => {
  const already = S.daily.date === today() && S.daily.done; const hard = !!S.seen.dailyHard;
  runQuiz(view, { title: '🎯 Daily Mix' + (hard ? ' · Hard' : ''), back: 'daily', questions: dailyQuestions(hard), time: hard ? 9 : 14,
    onDone: r => { if (!already) { S.daily = { date: today(), done: true, score: r.score }; bump('dailies'); save(); }
      finishRound(view, { title: 'Daily Mix', back: 'daily', again: () => go('daily'), score: r.score, acc: r.acc, total: 5, perfectMin: 5, xp: already ? r.right * 4 : r.right * 15 + 40, lines: [['Right', r.right + '/5'], ['Streak', '🔥 ' + streakAlive() + ' days']] }); } });
});
route('potd', view => {
  view.innerHTML = `${topbar('♟️ Puzzle of the Day', 'daily')}<div class="pzbox"></div>`;
  const pz = puzzleOfDay(!!S.seen.dailyHard);
  playPuzzle($('.pzbox', view), pz, { onEnd(ok, first, info) { setReview({ items: [pzReviewItem(pz, ok, first, info)], retry: null }); const fresh = S.seen.potd !== dayNumber(); if (ok) { S.seen.potd = dayNumber(); save(); if (pz.mate) bump('mates'); }
    finishRound(view, { title: 'Puzzle of the Day', back: 'daily', again: () => go('potd'), acc: first ? 100 : ok ? 60 : 0, total: 1, big: ok ? (first ? 'Solved first try!' : 'Solved!') : 'Try again tomorrow', xp: ok && fresh ? (first ? 40 : 20) : 5, lines: [] }); } });
});

// ---------- trophies ----------
const BEST_NAMES = { flags_: 'Flag Frenzy', caps_usa_: 'State Capitals', caps_: 'Capital Clash', map_: 'Find it', soc_: 'Soccer Trivia', shoot_: 'Shootout', fib: 'Fact or Fib', factquiz: 'Quick Quiz', sprint: 'Puzzle Blitz', rated: 'Puzzle rating' };
function bestLabel(k) { for (const p of Object.keys(BEST_NAMES)) if (k.startsWith(p)) { const rest = k.slice(p.length).replace(/_/g, ' '); const lv = rest.replace(/(^| )([1-4])$/, (m, a, d) => a + LEVELS[d - 1]).replace(/^\w/, c => c.toUpperCase()); return BEST_NAMES[p] + (lv ? ' · ' + lv : ''); } return k; }
route('trophies', view => {
  const L = levelFor(S.xp); checkBadges();
  const bests = Object.entries(S.bests);
  view.innerHTML = `${topbar('🏆 Trophy Cabinet')}
  <section class="card statrow" data-testid="stats"><div><b>${L.lvl}</b><small>Level · ${esc(titleFor(L.lvl))}</small></div><div><b>${S.xp.toLocaleString()}</b><small>Total XP</small></div><div><b>🔥 ${streakAlive()}</b><small>Streak (best ${S.streak.best || 0})</small></div><div><b>🛡️ ${S.streak.shields}</b><small>Streak shields</small></div></section>
  <p class="muted center small">Play 7 days in a row to earn a 🛡️ shield. It saves your streak if you miss a day.</p>
  <h2 class="sec">Badges <small>${Object.keys(S.badges).length}/${BADGES.length}</small></h2>
  <div class="badges">${BADGES.map(b => `<div class="bdg ${S.badges[b.id] ? 'got' : ''}" data-testid="badge"><span>${b.e}</span><b>${esc(b.n)}</b><small>${esc(b.d)}</small></div>`).join('')}</div>
  <h2 class="sec">Personal bests</h2>
  <div class="bests card">${bests.length ? bests.map(([k, b]) => `<div><span>${esc(bestLabel(k))}</span><b>${b.time != null ? fmtTime(b.time) : (b.score != null ? b.score.toLocaleString() : '-')}</b></div>`).join('') : '<p class="muted">Play a round to set your first record!</p>'}</div>
  <div class="center"><button class="btn danger small" data-testid="reset">Reset all progress</button></div>`;
  $('[data-testid=reset]', view).onclick = () => { if (confirm('Erase all XP, badges and bests on this device?')) { resetAll(); toast('Progress reset'); go('home'); } };
});

// ---------- boot ----------
const start = (location.hash || '').slice(1);
go(['geo', 'chess', 'soccer', 'facts', 'daily', 'trophies'].includes(start) ? start : 'home');
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h && h !== document.body.dataset.screen) go(h); });
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').then(reg => { hook.swReady = true; }).catch(() => {});
if (TEST) { hook.go = go; hook.state = () => S; hook.ready = true; }
