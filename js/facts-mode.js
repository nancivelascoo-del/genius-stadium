// Fact Lab (Fact of the Day, Fact or Fib blitz, Quick Quiz, Vault) and Soccer Stadium (shootout + trivia).
import { FACTS, FIBS, SOCCER } from './content.js';
import { S, save, $, $$, esc, sfx, toast, shuffle, seeded, dayNumber, fmtTime, route, go, topbar, hook, bump, setMax, onCleanup, confetti } from './core.js';
import { runQuiz, finishRound, mc, setReview } from './quiz.js';
import { LEVELS } from './geo-mode.js';
const diffChips = (lvl, note) => `<div class="diffbar"><span>Difficulty</span><div class="chips small" data-testid="difficulty">${LEVELS.map((n, i) => `<button class="chip ${lvl === i + 1 ? 'on' : ''}" data-l="${i + 1}" data-testid="lvl-${i + 1}">${n}</button>`).join('')}</div></div><p class="diffnote" data-testid="diffnote">${note}</p>`;
const FACT_NOTE = { 1: '🟢 Easy: fun facts, lots of time.', 2: '🟡 Medium: same facts, faster clock.', 3: '🟠 Hard: tougher science and world facts mixed in, even faster.', 4: '🔴 Expert: only the toughest facts, and the clock is really quick.' };
const FIB_TIME = [0, 60, 50, 45, 30], FQ_TIME = [0, 14, 11, 9, 7];
const factPool = lvl => FACTS.map((_, i) => i).filter(i => lvl === 4 ? FACTS[i].t === 3 : lvl === 3 ? true : !FACTS[i].t);
const fibPool = lvl => FIBS.map((_, i) => i).filter(i => lvl === 4 ? FIBS[i].t === 3 : lvl === 3 ? true : lvl === 2 ? true : !FIBS[i].t);

export function factOfDay() { const r = seeded(20261023); const order = FACTS.map((_, i) => [r(), i]).sort((a, b) => a[0] - b[0]).map(x => x[1]); return order[dayNumber() % order.length]; }
function unlock(i) { if (!S.facts.includes(i)) { S.facts.push(i); save(); return true; } return false; }
const factQ = i => { const f = FACTS[i]; return { ...mc(`<span class="qemoji">${f.e}</span>${esc(f.q)}`, f.a, f.w), why: f.why, fi: i, kind: 'fact', id: i }; };

route('facts', view => {
  const fi = factOfDay(), f = FACTS[fi]; const lvl = S.seen.factLevel || 1;
  view.innerHTML = `${topbar('💡 Fact Lab')}${diffChips(lvl, FACT_NOTE[lvl])}
  <button class="fotd card" data-testid="fotd"><span class="tag">FACT OF THE DAY</span><span class="big">${f.e}</span><b>${esc(f.q)}</b><small>${S.facts.includes(fi) ? '✅ Unlocked. Tap to see it again' : 'Tap to find out!'}</small></button>
  <div class="modes">
    <div class="mode card"><div class="mi">🕵️</div><h3>Fact or Fib?</h3><p>${FIB_TIME[lvl]} seconds. True or made up? Go!</p><button class="btn primary" data-testid="fib">Start blitz</button><small>${S.bests[fibKey(lvl)] ? 'Best ' + S.bests[fibKey(lvl)].score : 'No best yet'}</small></div>
    <div class="mode card"><div class="mi">⚡</div><h3>Quick Quiz</h3><p>10 wild facts. Speed = points.</p><button class="btn primary" data-testid="factquiz">Play 10</button><small>${S.bests[fqKey(lvl)] ? 'Best ' + S.bests[fqKey(lvl)].score.toLocaleString() : 'No best yet'}</small></div>
    <div class="mode card"><div class="mi">🔐</div><h3>Fact Vault</h3><p>Every fact you get right is unlocked here.</p><button class="btn" data-testid="vault">Open vault</button><small>${S.facts.length}/${FACTS.length} unlocked</small></div>
  </div>`;
  $('[data-testid=fotd]', view).onclick = () => { sfx.tap(); go('fotd'); };
  $$('.chip[data-l]', view).forEach(b => b.onclick = () => { S.seen.factLevel = +b.dataset.l; save(); sfx.tap(); go('facts'); });
  $('[data-testid=fib]', view).onclick = () => { sfx.tap(); go('fib', { lvl }); };
  $('[data-testid=factquiz]', view).onclick = () => { sfx.tap(); go('factquiz', { lvl }); };
  $('[data-testid=vault]', view).onclick = () => { sfx.tap(); go('vault'); };
});

route('fotd', (view, { back = 'facts' }) => {
  const fi = factOfDay(), f = FACTS[fi]; const q = factQ(fi);
  view.innerHTML = `${topbar('Fact of the Day', back)}<section class="card fotdq pop"><div class="big">${f.e}</div><span class="tag">${esc(f.c)}</span><h2 data-testid="question">${esc(f.q)}</h2><p class="guess">Make a guess first!</p>
    <div class="choices" data-testid="choices">${q.choices.map((c, k) => `<button class="choice" data-k="${k}" data-testid="choice">${esc(c)}</button>`).join('')}</div><div class="why" data-testid="why"></div></section>`;
  hook.answer = () => q.answer;
  $$('.choice', view).forEach(b => b.onclick = () => {
    const k = +b.dataset.k; const ok = k === q.answer; $$('.choice', view).forEach(x => x.disabled = true); $$('.choice', view)[q.answer].classList.add('right'); if (!ok) b.classList.add('wrong');
    ok ? sfx.good() : sfx.bad(); const fresh = unlock(fi); if (fresh) confetti(25);
    $('.why', view).innerHTML = `<b class="${ok ? 'ok' : 'no'}">${ok ? '✓ You got it!' : 'The answer: ' + esc(f.a)}</b> ${esc(f.why)}<div class="row"><span class="badge-new">🔐 ${fresh ? 'Added to your Fact Vault!' : 'Already in your vault'}</span><button class="btn primary" data-go="${back}" data-testid="fotd-done">Done</button></div>`;
    $('.why', view).classList.add('show'); S.seen.fotd = dayNumber(); save();
  });
});

const fibKey = lvl => lvl > 1 ? 'fib_' + lvl : 'fib';
const fqKey = lvl => lvl > 1 ? 'factquiz_' + lvl : 'factquiz';
route('fib', (view, { lvl = 1, items }) => {
  const pool = fibPool(lvl); const hard = pool.filter(i => FIBS[i].t === 3);
  const deck = items ? items.slice() : lvl === 2 ? shuffle([...shuffle(pool.filter(i => !FIBS[i].t)), ...shuffle(hard).slice(0, 8)]) : shuffle(pool);
  const secs = items ? Math.max(20, items.length * 6) : FIB_TIME[lvl]; const log = [];
  let k = 0, score = 0, streak = 0, wrong = 0, locked = false, end = performance.now() + secs * 1000, over = false;
  view.innerHTML = `${topbar((items ? '🔁 ' : '🕵️ ') + 'Fact or Fib?' + (lvl > 1 ? ' · ' + LEVELS[lvl - 1] : ''), 'facts', `<div class="hud"><span class="pill time" data-testid="clock">${secs}</span><span class="pill score" data-testid="score">0</span></div>`)}
    <section class="fibbox"><div class="combo" data-testid="combo"></div><div class="card fibcard pop" data-testid="statement"></div>
    <div class="row tfrow"><button class="btn tf fact" data-testid="btn-fact">✓ FACT</button><button class="btn tf fib" data-testid="btn-fib">✗ FIB</button></div><div class="why" data-testid="why"></div></section>`;
  const card = $('.fibcard', view), why = $('.why', view);
  const tick = setInterval(() => { const left = Math.max(0, end - performance.now()); $('[data-testid=clock]', view).textContent = Math.ceil(left / 1000); if (left <= 0) finish(); }, 200);
  onCleanup(() => clearInterval(tick));
  function show() { if (over) return; if (k >= deck.length) { if (items) { finish(); return; } deck.push(...shuffle(deck.slice(0, deck.length))); } const it = FIBS[deck[k]]; card.textContent = it.s; card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop'); hook.answer = () => it.f; locked = false; }
  function ans(sayFact) {
    if (locked || over) return; locked = true; const fi = deck[k++]; const it = FIBS[fi]; const ok = sayFact === it.f;
    log.push({ fi, ok, prompt: '🕵️ ' + esc(it.s), mine: sayFact ? '✓ Fact' : '✗ Fib', right: it.f ? '✓ Fact' : '✗ Fib', why: it.why });
    if (ok) { score++; streak++; sfx.good(); $('[data-testid=score]', view).textContent = score; card.classList.add('flashok'); }
    else { streak = 0; wrong++; sfx.bad(); card.classList.add('flashno'); }
    $('.combo', view).textContent = streak >= 3 ? '🔥 x' + streak : '';
    why.innerHTML = `<b class="${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'}</b> ${esc(it.why)}`; why.classList.add('show');
    setTimeout(() => { card.classList.remove('flashok', 'flashno'); show(); }, ok ? 700 : 1600);
  }
  $('[data-testid=btn-fact]', view).onclick = () => ans(true); $('[data-testid=btn-fib]', view).onclick = () => ans(false);
  function finish() { if (over) return; over = true; clearInterval(tick); if (!items) setMax('bestFib', score); const tot = score + wrong;
    const miss = log.filter(x => !x.ok).map(x => x.fi);
    setReview({ items: log, retry: miss.length ? () => go('fib', { lvl, items: miss }) : null });
    finishRound(view, { key: items ? null : fibKey(lvl), title: 'Fact or Fib?', back: 'facts', again: () => go('fib', { lvl, items }), score, bestBy: 'score', big: score + ' right', acc: tot ? Math.round(score / tot * 100) : 0, total: tot, perfectMin: 15, xp: score * 8, lines: [['Wrong', String(wrong)]] }); }
  hook.timeUp = () => { end = performance.now(); };
  show();
});

route('factquiz', (view, { lvl = 1 }) => {
  const pool = factPool(lvl); const missed = (S.missed.fact || []).filter(i => pool.includes(i)).slice(0, 3);
  let fresh = shuffle(pool.filter(i => !missed.includes(i)));
  if (lvl === 3) fresh = shuffle([...shuffle(fresh.filter(i => FACTS[i].t === 3)).slice(0, 6), ...fresh.filter(i => !FACTS[i].t)]);
  const pick = shuffle([...missed, ...fresh.slice(0, 10 - missed.length)]);
  runQuiz(view, { title: '⚡ Quick Quiz' + (lvl > 1 ? ' · ' + LEVELS[lvl - 1] : ''), back: 'facts', questions: pick.map(factQ), time: FQ_TIME[lvl], onRight: q => unlock(q.fi),
    onDone: r => finishRound(view, { key: fqKey(lvl), title: 'Quick Quiz', back: 'facts', again: () => go('factquiz', { lvl }), score: r.score, acc: r.acc, total: r.total, xp: r.right * 10 + r.score / 200, lines: [['Right', r.right + '/' + r.total], ['Vault', S.facts.length + '/' + FACTS.length + ' unlocked']] }) });
});

route('vault', view => {
  const cats = [...new Set(FACTS.map(f => f.c))];
  view.innerHTML = `${topbar('🔐 Fact Vault', 'facts')}<p class="center muted">${S.facts.length}/${FACTS.length} unlocked. Get facts right to unlock more.</p>
    ${cats.map(c => `<h2 class="sec">${esc(c)}</h2><div class="vault">${FACTS.map((f, i) => [f, i]).filter(([f]) => f.c === c).map(([f, i]) => S.facts.includes(i) ? `<button class="vt open" data-i="${i}" data-testid="vault-tile">${f.e}</button>` : `<div class="vt locked" data-testid="vault-tile">🔒</div>`).join('')}</div>`).join('')}
    <div class="modal hidden" data-testid="vault-card"></div>`;
  const m = $('.modal', view);
  $$('.vt.open', view).forEach(b => b.onclick = () => { const f = FACTS[+b.dataset.i]; sfx.tap(); m.innerHTML = `<div class="card pop center"><div class="big">${f.e}</div><h3>${esc(f.q)}</h3><p><b>${esc(f.a)}</b></p><p>${esc(f.why)}</p><button class="btn primary" data-testid="vault-close">Close</button></div>`; m.classList.remove('hidden'); $('button', m).onclick = () => m.classList.add('hidden'); });
});

// ---------- Soccer ----------
route('soccer', view => {
  const lvl = S.seen.socLevel || 1;
  view.innerHTML = `${topbar('⚽ Soccer Stadium')}
  ${diffChips(lvl, SOC_NOTE[lvl])}
  <div class="modes">
    <div class="mode card wide"><div class="mi">🥅</div><h3>Penalty Shootout</h3><p>Answer right to shoot. Answer FAST and the keeper is too slow to save it!</p><button class="btn primary big" data-testid="shootout">Take 5 penalties</button><small>${S.bests['shoot_' + lvl] ? 'Best ' + S.bests['shoot_' + lvl].score + '/5 goals' : 'No best yet'}</small></div>
    <div class="mode card"><div class="mi">🏆</div><h3>Soccer Trivia</h3><p>10 questions. Speed and combos score big.</p><button class="btn primary" data-testid="soctrivia">Play 10</button><small>${S.bests['soc_' + lvl] ? 'Best ' + S.bests['soc_' + lvl].score.toLocaleString() : 'No best yet'}</small></div>
  </div>`;
  $$('.chip[data-l]', view).forEach(b => b.onclick = () => { S.seen.socLevel = +b.dataset.l; save(); sfx.tap(); go('soccer'); });
  $('[data-testid=shootout]', view).onclick = () => { sfx.tap(); go('shootout', { lvl }); };
  $('[data-testid=soctrivia]', view).onclick = () => { sfx.tap(); go('soctrivia', { lvl }); };
});
const SOC_NOTE = { 1: '🟢 Easy: the basics and the rules. Slow keeper.', 2: '🟡 Medium: World Cups and star players.', 3: '🟠 Hard: tricky records and rules. Keeper gets quicker.', 4: '🔴 Expert: real soccer-nerd history. Fastest keeper, shortest clock.' };
const SOC_TIME = [0, 13, 12, 10, 8];
function socQs(lvl, n) {
  const ids = SOCCER.map((_, i) => i); const pool = ids.filter(i => SOCCER[i].t <= lvl); const hard = pool.filter(i => SOCCER[i].t === lvl);
  const missed = (S.missed.soc || []).filter(i => pool.includes(i)).slice(0, 2);
  const pick = shuffle([...missed, ...shuffle(hard).filter(i => !missed.includes(i)).slice(0, Math.ceil(n / 2)), ...shuffle(pool)].filter((x, i, a) => a.indexOf(x) === i).slice(0, n));
  return shuffle(pick).map(i => ({ ...mc(esc(SOCCER[i].q), SOCCER[i].a, SOCCER[i].w), why: SOCCER[i].why, kind: 'soc', id: i }));
}
route('shootout', (view, { lvl }) => {
  runQuiz(view, { title: '🥅 Penalty Shootout', back: 'soccer', questions: socQs(lvl, 5), time: SOC_TIME[lvl] - 1, penalty: true, keeper: lvl, onRight: () => bump('soccerRight'),
    onDone: r => { if (r.goals === 5) bump('perfectShootout'); finishRound(view, { key: 'shoot_' + lvl, title: 'Penalty Shootout', back: 'soccer', again: () => go('shootout', { lvl }), score: r.goals, bestBy: 'score', big: r.goals + '/5 goals ⚽', acc: r.acc, total: 5, perfectMin: 5, xp: r.right * 12 + r.goals * 8, lines: [['Right answers', r.right + '/5']] }); } });
});
route('soctrivia', (view, { lvl }) => {
  runQuiz(view, { title: '🏆 Soccer Trivia', back: 'soccer', questions: socQs(lvl, 10), time: SOC_TIME[lvl], onRight: () => bump('soccerRight'),
    onDone: r => finishRound(view, { key: 'soc_' + lvl, title: 'Soccer Trivia', back: 'soccer', again: () => go('soctrivia', { lvl }), score: r.score, acc: r.acc, total: r.total, xp: r.right * 10 + r.score / 200, lines: [['Right', r.right + '/' + r.total], ['Best combo', '🔥 ' + r.maxCombo]] }) });
});
