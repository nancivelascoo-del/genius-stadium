// Speed quiz engine (multiple choice + true/false), penalty-shootout wrapper, and the shared results screen.
import { S, save, $, $$, esc, sfx, toast, confetti, addXP, bump, setMax, recordBest, checkBadges, touchStreak, fmtTime, levelFor, titleFor, go, hook, onCleanup, topbar, miss, fixed } from './core.js';

// ---------- results ----------
// Review data for the round that just ended. Set by the game right before finishRound().
let pendingReview = null;
export function setReview(r) { pendingReview = r; }
export function clearReview() { pendingReview = null; }
export function finishRound(view, o) {
  // o: {key, title, back, again, score, time, acc, total, right, xp, lines, bestBy:'time'|'score', perfectMin}
  const rv = o.review || pendingReview; pendingReview = null;
  bump('rounds');
  if (o.acc === 100 && (o.total || 0) >= (o.perfectMin || 10)) bump('perfect');
  const streakMsg = touchStreak();
  const rec = o.key ? recordBest(o.key, { time: o.bestBy === 'time' ? o.time : null, score: o.bestBy !== 'time' ? o.score : null, acc: o.acc }) : { isNew: {}, prev: {} };
  const lvlUp = addXP(o.xp || 0);
  const badges = checkBadges();
  const newBest = (o.bestBy === 'time' ? rec.isNew.time : rec.isNew.score) && rec.prev.plays > 1;
  const stars = o.acc == null ? 3 : o.acc >= 90 ? 3 : o.acc >= 70 ? 2 : o.acc >= 40 ? 1 : 0;
  const b = rec.prev;
  view.innerHTML = `${topbar(esc(o.title), o.back)}
  <section class="results card pop" data-testid="results">
    <div class="stars">${[0, 1, 2].map(i => `<span class="${i < stars ? 'on' : ''}">★</span>`).join('')}</div>
    ${newBest ? '<div class="newbest" data-testid="new-best">NEW PERSONAL BEST!</div>' : ''}
    <div class="bigscore">${o.big ?? (o.score != null ? o.score.toLocaleString() : '')}</div>
    <div class="reslines">
      ${(o.lines || []).map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}
      ${o.key ? `<div><span>Your best</span><b>${o.bestBy === 'time' ? (b.time != null ? fmtTime(b.time) : '-') : (b.score != null ? b.score.toLocaleString() : '-')}</b></div>` : ''}
      <div class="xpline"><span>XP earned</span><b>+${Math.round(o.xp || 0)}</b></div>
    </div>
    ${badges.map(x => `<div class="badge-new">${x.e} New badge: <b>${esc(x.n)}</b></div>`).join('')}
    ${streakMsg ? `<div class="badge-new">${esc(streakMsg)}</div>` : ''}
    <div class="row">
      <button class="btn big primary" data-testid="again">Play again</button>
      <button class="btn big" data-go="${o.back}" data-testid="done">Done</button>
    </div>
    ${rv && rv.items.length ? `<button class="btn rvjump" data-testid="review-jump">📋 Review your answers ↓</button>` : ''}
  </section>
  ${rv && rv.items.length ? reviewHtml(rv) : ''}`;
  $('[data-testid=again]', view).onclick = () => { sfx.tap(); o.again(); };
  if (rv && rv.items.length) wireReview(view, rv);
  if (stars >= 2 || newBest) { confetti(newBest ? 70 : 35); sfx.win(); }
  if (lvlUp) { const t = setTimeout(() => levelUp(lvlUp), 600); onCleanup(() => clearTimeout(t)); }
}
export function levelUp(lvl) {
  sfx.level(); confetti(90);
  const m = document.createElement('div'); m.className = 'modal'; m.dataset.testid = 'levelup';
  m.innerHTML = `<div class="card pop center"><div class="lvlbig">${lvl}</div><h2>Level up!</h2><p>You are now a <b>${esc(titleFor(lvl))}</b>.</p><button class="btn big primary">Let's go</button></div>`;
  m.querySelector('button').onclick = () => m.remove(); document.body.appendChild(m);
}

// ---------- quiz ----------
// questions: [{prompt, sub?, img?, choices:[...], answer: index, why?, kind?, id?, tf?}]
export function runQuiz(view, opts) {
  const qs = opts.questions; const T = (opts.time || 12) * 1000; const log = []; pendingReview = null;
  let i = 0, score = 0, right = 0, combo = 0, maxCombo = 0, t0 = 0, timer = null, locked = false, goals = 0;
  const startAll = performance.now();
  view.innerHTML = `${topbar(esc(opts.title), opts.back, `<div class="hud"><span class="pill" data-testid="qcount"></span><span class="pill score" data-testid="score">0</span></div>`)}
    <div class="progress"><i></i></div>
    <section class="quiz">
      ${opts.penalty ? '<div class="pitch" data-testid="pitch"></div>' : ''}
      <div class="qcard card"><div class="combo" data-testid="combo"></div><div class="qimg"></div><h2 class="qtext" data-testid="question"></h2><div class="qsub"></div><div class="timer"><i></i></div></div>
      <div class="choices" data-testid="choices"></div>
      <div class="why" data-testid="why"></div>
    </section>`;
  const el = { q: $('.qtext', view), sub: $('.qsub', view), img: $('.qimg', view), ch: $('.choices', view), why: $('.why', view), bar: $('.timer i', view), prog: $('.progress i', view), count: $('[data-testid=qcount]', view), score: $('[data-testid=score]', view), combo: $('.combo', view), pitch: $('.pitch', view) };
  if (opts.penalty) drawPitch(el.pitch);
  function show() {
    const q = qs[i]; locked = false; el.why.innerHTML = ''; el.why.className = 'why';
    el.count.textContent = (i + 1) + '/' + qs.length; el.prog.style.width = (i / qs.length * 100) + '%';
    el.q.innerHTML = q.prompt; el.sub.innerHTML = q.sub || ''; el.img.innerHTML = q.img || ''; el.img.style.display = q.img ? '' : 'none';
    el.ch.className = 'choices' + (q.tf ? ' tf' : '') + (q.flags ? ' flagchoices' : '');
    el.ch.innerHTML = q.choices.map((c, k) => `<button class="choice" data-k="${k}" data-testid="choice">${q.flags ? c : esc(c)}</button>`).join('');
    $$('.choice', el.ch).forEach(b => b.onclick = () => answer(+b.dataset.k));
    hook.answer = () => q.answer;
    el.bar.style.transition = 'none'; el.bar.style.width = '100%'; void el.bar.offsetWidth;
    el.bar.style.transition = `width ${T}ms linear`; el.bar.style.width = '0%';
    t0 = performance.now(); clearTimeout(timer); timer = setTimeout(() => answer(-1), T);
  }
  function answer(k) {
    if (locked) return; locked = true; clearTimeout(timer);
    const q = qs[i]; const dt = performance.now() - t0; const ok = k === q.answer;
    const btns = $$('.choice', el.ch); btns.forEach(b => b.disabled = true);
    log.push({ type: 'q', q, prompt: q.prompt, img: q.img || q.sub || '', html: !!q.flags, mine: k >= 0 ? q.choices[k] : null, right: q.choices[q.answer], ok, why: q.why || '' });
    if (btns[q.answer]) btns[q.answer].classList.add('right');
    if (!ok && k >= 0) btns[k].classList.add('wrong');
    el.bar.style.transition = 'none'; el.bar.style.width = el.bar.getBoundingClientRect().width / el.bar.parentElement.getBoundingClientRect().width * 100 + '%';
    if (ok) {
      combo++; maxCombo = Math.max(maxCombo, combo); right++;
      const pts = Math.round(1000 * (1 - dt / T / 2)) + Math.min(combo - 1, 5) * 100; score += pts;
      el.score.textContent = score.toLocaleString(); el.combo.textContent = combo >= 2 ? '🔥 x' + combo : ''; el.combo.classList.remove('bump'); void el.combo.offsetWidth; el.combo.classList.add('bump');
      sfx.good(); opts.onRight && opts.onRight(q); if (q.id && q.kind) fixed(q.kind, q.id);
    } else {
      combo = 0; el.combo.textContent = ''; sfx.bad(); opts.onWrong && opts.onWrong(q); if (q.id && q.kind) miss(q.kind, q.id);
    }
    el.why.innerHTML = (ok ? '<b class="ok">✓ Nice!</b> ' : `<b class="no">${k < 0 ? '⏰ Time!' : '✗'}</b> `) + (q.why ? esc(q.why) : '');
    el.why.classList.add('show');
    const next = () => { i++; if (i >= qs.length) done(); else show(); };
    if (opts.penalty) { penaltyKick(el.pitch, view, ok, dt < T * [0.4, 0.4, 0.4, 0.33, 0.25][opts.keeper || 1], opts.keeper || 1).then(g => { if (g) goals++; setTimeout(next, 700); }); return; }
    if (ok) setTimeout(next, q.why ? 1500 : 800);
    else { const nb = document.createElement('button'); nb.className = 'btn primary next'; nb.dataset.testid = 'next'; nb.textContent = 'Next ▶'; nb.onclick = () => { sfx.tap(); next(); }; el.why.appendChild(nb); }
  }
  function done() {
    el.prog.style.width = '100%'; setMax('bestCombo', maxCombo);
    const acc = Math.round(right / qs.length * 100);
    const missedQs = log.filter(x => !x.ok).map(x => x.q);
    pendingReview = { items: log, retry: missedQs.length ? () => go('retryquiz', { title: opts.title, back: opts.back, questions: missedQs, time: opts.time, penalty: opts.penalty, keeper: opts.keeper }) : null };
    opts.onDone({ score, right, total: qs.length, acc, maxCombo, goals, time: performance.now() - startAll });
  }
  show();
  onCleanup(() => clearTimeout(timer));
}

// ---------- penalty shootout visuals ----------
function drawPitch(box) {
  box.innerHTML = `<svg viewBox="0 0 400 190" class="goal-svg" aria-hidden="true">
    <defs><pattern id="net" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M0 0L10 10M10 0L0 10" stroke="#ffffff33" stroke-width="1"/></pattern></defs>
    <rect x="0" y="150" width="400" height="40" fill="#2f9e44"/><rect x="0" y="150" width="400" height="40" fill="url(#stripes)" opacity=".2"/>
    <rect x="60" y="20" width="280" height="130" fill="url(#net)"/>
    <path d="M60 150V20H340V150" fill="none" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>
    <g class="keeper" transform="translate(200 105)"><circle r="11" cy="-30" fill="#ffd166"/><rect x="-16" y="-18" width="32" height="38" rx="8" fill="#f72585"/><rect x="-34" y="-16" width="20" height="9" rx="4" fill="#f72585"/><rect x="14" y="-16" width="20" height="9" rx="4" fill="#f72585"/><rect x="-12" y="20" width="9" height="24" rx="4" fill="#222"/><rect x="3" y="20" width="9" height="24" rx="4" fill="#222"/></g>
    <g class="ball" transform="translate(200 172)"><circle r="10" fill="#fff" stroke="#222" stroke-width="2"/><path d="M0-4l4 3-1.5 4.5h-5L-4-1z" fill="#222"/></g>
    <g class="zones"></g>
  </svg><div class="kickmsg" data-testid="kickmsg"></div><div class="tally" data-testid="tally"></div>`;
  box.dataset.goals = 0; box.dataset.kicks = 0; tally(box);
}
function tally(box) { const g = +box.dataset.goals, k = +box.dataset.kicks; box.querySelector('.tally').innerHTML = [...Array(5)].map((_, i) => `<i class="${i < k ? (i < k && box.dataset['k' + i] === '1' ? 'g' : 'm') : ''}"></i>`).join('') + ` <b>${g}</b>`; }
const ZONES = [[100, 50], [200, 50], [300, 50], [100, 120], [200, 120], [300, 120]];
function penaltyKick(box, view, correct, fast, keeper = 1) {
  return new Promise(resolve => {
    const svg = box.querySelector('svg'), keeper = svg.querySelector('.keeper'), ball = svg.querySelector('.ball'), zones = svg.querySelector('.zones'), msg = box.querySelector('.kickmsg');
    const finish = (goal, zone) => {
      const kz = Math.floor(Math.random() * 3); // keeper guesses a side
      // Harder levels = quicker keeper: on Hard he also reaches high shots, on Expert he can save even off his guess.
      let saved = !goal || (!fast && kz === zone % 3 && (zone >= 3 || keeper >= 3 || Math.random() < 0.5)) || (!fast && keeper === 4 && Math.random() < 0.25);
      if (!correct) saved = true;
      const [zx, zy] = ZONES[zone];
      const kx = [110, 200, 290][saved ? zone % 3 : kz]; const rot = (saved ? zone % 3 : kz) === 0 ? -60 : (saved ? zone % 3 : kz) === 2 ? 60 : 0;
      keeper.style.transition = 'transform .45s ease-out'; keeper.setAttribute('transform', `translate(${kx} ${saved ? zy + 30 : 105}) rotate(${rot})`);
      ball.style.transition = 'transform .45s ease-out'; ball.setAttribute('transform', `translate(${saved ? kx : zx} ${saved ? zy + 20 : zy})`);
      const k = +box.dataset.kicks; box.dataset['k' + k] = saved ? '0' : '1'; box.dataset.kicks = k + 1; if (!saved) box.dataset.goals = +box.dataset.goals + 1;
      setTimeout(() => {
        msg.textContent = saved ? (correct ? 'SAVED! 🧤' : 'MISSED 😬') : 'GOAAAL! ⚽'; msg.className = 'kickmsg show ' + (saved ? 'no' : 'yes');
        if (!saved) { sfx.goal(); confetti(25); } tally(box);
        setTimeout(() => { msg.className = 'kickmsg'; keeper.style.transition = ball.style.transition = 'none'; keeper.setAttribute('transform', 'translate(200 105)'); ball.setAttribute('transform', 'translate(200 172)'); resolve(!saved); }, 1000);
      }, 480);
    };
    if (!correct) { setTimeout(() => finish(false, Math.floor(Math.random() * 6)), 400); return; }
    msg.textContent = fast ? '⚡ Fast answer! Keeper is slow. Pick a spot!' : 'Pick a spot to shoot!'; msg.className = 'kickmsg show';
    zones.innerHTML = ZONES.map(([x, y], z) => `<g class="zone" data-z="${z}" data-testid="zone"><circle cx="${x}" cy="${y}" r="28" /><text x="${x}" y="${y + 7}" text-anchor="middle">🎯</text></g>`).join('');
    hook.zone = () => 0;
    zones.querySelectorAll('.zone').forEach(zn => zn.addEventListener('click', () => { zones.innerHTML = ''; msg.className = 'kickmsg'; finish(true, +zn.dataset.z); }, { once: true }));
  });
}

// helper to build a 4-choice question from right answer + wrong list
export function mc(prompt, right, wrongs, extra = {}) {
  const choices = [right, ...wrongs.slice(0, 3)].map(String); const order = choices.map((_, k) => k).sort(() => Math.random() - 0.5);
  return { prompt, choices: order.map(k => choices[k]), answer: order.indexOf(0), ...extra };
}

// ---------- review screen ----------
const MARK = ok => ok ? '<span class="rvmark ok" aria-label="right">✓</span>' : '<span class="rvmark no" aria-label="wrong">✗</span>';
function reviewHtml(rv) {
  const right = rv.items.filter(x => x.ok).length, missed = rv.items.length - right;
  return `<section class="review card" data-testid="review"><div class="rvhead"><h2>📋 Review <small>${right}/${rv.items.length} right</small></h2>
    ${missed && rv.retry ? `<button class="btn primary" data-testid="retry-missed">🔁 Retry the ${missed} you missed</button>` : missed ? '' : '<span class="okline">Perfect! Nothing to fix. 🌟</span>'}</div>
    ${rv.top || ''}
    <ol class="rvlist">${rv.items.map((it, n) => `<li class="rv ${it.ok ? 'ok' : 'no'}" data-testid="review-item" data-ok="${it.ok ? 1 : 0}"${it.id ? ` data-id="${esc(it.id)}"` : ''}>${MARK(it.ok)}<div class="rvbody">${itemHtml(it, n)}</div></li>`).join('')}</ol></section>`;
}
function itemHtml(it, n) {
  if (it.html_full) return it.html_full;
  const val = v => v == null ? '<i>⏰ no answer</i>' : it.html ? v : esc(v);
  return `<div class="rvq">${it.prompt}</div>${it.img ? `<div class="rvimg">${it.img}</div>` : ''}
    <div class="rva">${it.ok ? `<span>✓ ${val(it.right)}</span>` : `<span class="mine">Your answer: ${val(it.mine)}</span><span class="right">Correct: ${val(it.right)}</span>`}</div>
    ${it.why ? `<div class="rvwhy">💡 ${esc(it.why)}</div>` : ''}`;
}
function wireReview(view, rv) {
  const j = $('[data-testid=review-jump]', view); if (j) j.onclick = () => { sfx.tap(); $('[data-testid=review]', view).scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const r = $('[data-testid=retry-missed]', view); if (r) r.onclick = () => { sfx.tap(); rv.retry(); };
  if (rv.wire) rv.wire(view);
}
// Retry only the questions you missed (no best score, small XP)
import { route as _route } from './core.js';
_route('retryquiz', (view, p) => {
  runQuiz(view, { title: '🔁 ' + p.title.replace(/^🔁 /, ''), back: p.back, questions: p.questions.map(q => ({ ...q })), time: p.time, penalty: p.penalty, keeper: p.keeper,
    onDone: r => finishRound(view, { title: 'Retry: ' + p.title.replace(/^🔁 /, ''), back: p.back, again: () => go('retryquiz', p), acc: r.acc, total: r.total, big: r.right + '/' + r.total + ' fixed', xp: r.right * 6, lines: [['Fixed', r.right + '/' + r.total]] }) });
});
