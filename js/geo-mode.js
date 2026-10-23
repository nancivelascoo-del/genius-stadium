// Geo Arena: tap-the-map runs, flags, capitals, explore. World + USA.
import { GEO } from '../data/geo.js';
import { S, save, $, $$, esc, sfx, toast, shuffle, fmtTime, route, go, topbar, hook, bump, setMax, miss, fixed, onCleanup } from './core.js';
import { runQuiz, finishRound, mc, setReview } from './quiz.js';

const C = GEO.countries, ST = GEO.states;
const REGIONS = ['world', 'europe', 'africa', 'asia', 'namerica', 'samerica', 'oceania'];
const RNAME = { world: 'World', europe: 'Europe', africa: 'Africa', asia: 'Asia', namerica: 'N. America', samerica: 'S. America', oceania: 'Oceania', usa: 'USA' };
export const flagImg = (cc, cls = 'flag') => `<img class="${cls}" src="flags/${cc.toLowerCase()}.svg" alt="" draggable="false">`;
const nameOf = (id, usa) => usa ? (ST[id] && ST[id].n) : (C[id] && C[id].n);
const LOOK = [['ID', 'MC', 'PL', 'SG'], ['RO', 'TD', 'BE', 'ML'], ['IE', 'CI', 'IT', 'MX'], ['NL', 'LU', 'RU', 'FR', 'PY', 'HR'], ['AU', 'NZ', 'FJ', 'GB'], ['NO', 'IS', 'DK', 'SE', 'FI'], ['CO', 'EC', 'VE'], ['SN', 'ML', 'GN', 'CM'], ['SV', 'NI', 'HN', 'GT', 'AR'], ['JO', 'SD', 'KW', 'AE'], ['SK', 'SI', 'RS', 'RU'], ['EG', 'IQ', 'SY'], ['LT', 'BO', 'GH', 'ET'], ['US', 'LR', 'MY'], ['AT', 'LV', 'LB', 'PE'], ['QA', 'BH', 'AE'], ['CZ', 'PH', 'CU', 'PR']];
const TRAP = { CA: ['Los Angeles', 'San Francisco'], NY: ['New York City'], IL: ['Chicago'], FL: ['Miami', 'Orlando'], PA: ['Philadelphia', 'Pittsburgh'], WA: ['Seattle'], TX: ['Houston', 'Dallas'], NV: ['Las Vegas'], OR: ['Portland'], MO: ['St. Louis', 'Kansas City'], KY: ['Louisville'], LA: ['New Orleans'], MI: ['Detroit'], OH: ['Cleveland', 'Cincinnati'], MD: ['Baltimore'], NJ: ['Newark'], WI: ['Milwaukee'], MN: ['Minneapolis'], AK: ['Anchorage'], VT: ['Burlington'], NH: ['Manchester'], ME: ['Portland'], DE: ['Wilmington'], SC: ['Charleston'], NC: ['Charlotte'], TN: ['Memphis'], AL: ['Birmingham'], KS: ['Wichita'], NE: ['Omaha'], ND: ['Fargo'], SD: ['Sioux Falls'], MT: ['Billings'], NM: ['Albuquerque'], CT: ['Bridgeport'], VA: ['Virginia Beach'] };

function usaMode() { return !!S.seen.usa; }

route('geo', view => {
  const usa = usaMode();
  const lvl = S.seen.geoLevel || 1; const reg = S.seen.geoRegion || 'europe';
  view.innerHTML = `${topbar('🌍 Geo Arena')}
  <div class="diffbar"><span>Difficulty</span>${levelChips(lvl)}</div><p class="diffnote" data-testid="diffnote">${DIFF_NOTE[lvl]}</p>
  <div class="seg" role="tablist"><button data-testid="tab-world" class="${!usa ? 'on' : ''}">🌐 World</button><button data-testid="tab-usa" class="${usa ? 'on' : ''}">🇺🇸 USA</button></div>
  ${usa ? `
  <div class="modes">
    <div class="mode card"><div class="mi">🗺️</div><h3>Find the State</h3><p>Tap it on the map. Beat your time.</p>
      <div class="row"><button class="btn primary" data-testid="usa-sprint">Sprint 10</button><button class="btn" data-testid="usa-full">All 50</button></div>
      <small>${bestTxt(mapKey('usa', 10, lvl))} · ${bestTxt(mapKey('usa', 0, lvl))}</small></div>
    <div class="mode card"><div class="mi">🏛️</div><h3>State Capitals</h3><p>Watch out for big-city traps!</p>
      <button class="btn primary" data-testid="usa-caps">Play 10</button><small>${bestTxt('caps_usa_' + lvl, 'score')}</small></div>
    <div class="mode card"><div class="mi">🔭</div><h3>Explore USA</h3><p>Tap any state to learn about it.</p><button class="btn" data-testid="usa-explore">Explore</button></div>
  </div>` : `
  <div class="chips" data-testid="regions">${REGIONS.map(r => `<button class="chip ${r === reg ? 'on' : ''}" data-r="${r}">${RNAME[r]}</button>`).join('')}</div>
  <div class="modes">
    <div class="mode card"><div class="mi">🗺️</div><h3>Find the Country</h3><p>${RNAME[reg]} map. Tap fast, tap right.</p>
      <div class="row"><button class="btn primary" data-testid="map-sprint">Sprint 10</button><button class="btn" data-testid="map-full">Full map</button></div>
      <small>${bestTxt(mapKey(reg, 10, lvl))} · ${bestTxt(mapKey(reg, 0, lvl))}</small></div>
    <div class="mode card"><div class="mi">🚩</div><h3>Flag Frenzy</h3><p>Name the flag. Hard and Expert have look-alikes!</p>
      <button class="btn primary" data-testid="flags">Play 10</button><small>${bestTxt('flags_' + lvl, 'score')}</small></div>
    <div class="mode card"><div class="mi">🏛️</div><h3>Capital Clash</h3><p>Match countries and capitals.</p>
      <button class="btn primary" data-testid="caps">Play 10</button><small>${bestTxt('caps_' + lvl, 'score')}</small></div>
    <div class="mode card"><div class="mi">🔭</div><h3>Explore</h3><p>Tap any country: flag, capital, more.</p><button class="btn" data-testid="explore">Explore</button><small>${Object.keys(S.seen.explored || {}).length} explored</small></div>
  </div>`}`;
  $('[data-testid=tab-world]', view).onclick = () => { S.seen.usa = false; save(); go('geo'); };
  $('[data-testid=tab-usa]', view).onclick = () => { S.seen.usa = true; save(); go('geo'); };
  $$('.chip[data-r]', view).forEach(b => b.onclick = () => { S.seen.geoRegion = b.dataset.r; save(); sfx.tap(); go('geo'); });
  $$('.chip[data-l]', view).forEach(b => b.onclick = () => { S.seen.geoLevel = +b.dataset.l; save(); sfx.tap(); go('geo'); });
  const on = (id, fn) => { const b = $(`[data-testid=${id}]`, view); if (b) b.onclick = () => { sfx.tap(); fn(); }; };
  on('map-sprint', () => go('mapplay', { region: reg, n: 10, lvl }));
  on('map-full', () => go('mapplay', { region: reg, n: 0, lvl }));
  on('usa-sprint', () => go('mapplay', { region: 'usa', n: 10, lvl }));
  on('usa-full', () => go('mapplay', { region: 'usa', n: 0, lvl }));
  on('flags', () => go('flagquiz', { lvl }));
  on('caps', () => go('capquiz', { lvl }));
  on('usa-caps', () => go('capquiz', { lvl, usa: true }));
  on('explore', () => go('explore', { region: reg }));
  on('usa-explore', () => go('explore', { region: 'usa' }));
});
export const LEVELS = ['Easy', 'Medium', 'Hard', 'Expert'];
const DIFF_NOTE = { 1: '🟢 Easy: famous places, lots of time.', 2: '🟡 Medium: more countries, trickier choices.', 3: '🟠 Hard: all countries, look-alike flags, big-city traps, less time.', 4: '🔴 Expert: tiny and rare countries, super short timer, no flag clue on the map, one wrong tap and it is shown.' };
const mapKey = (region, n, lvl) => 'map_' + region + '_' + (n ? '10' : 'full') + ((lvl || 1) > 1 ? '_' + lvl : '');
function levelChips(lvl) { return `<div class="chips small" data-testid="difficulty">${LEVELS.map((n, i) => `<button class="chip ${lvl === i + 1 ? 'on' : ''}" data-l="${i + 1}" data-testid="lvl-${i + 1}">${n}</button>`).join('')}</div>`; }
function bestTxt(key, by = 'time') { const b = S.bests[key]; if (!b) return 'No best yet'; return 'Best ' + (by === 'time' ? (b.time != null ? fmtTime(b.time) : '-') : b.score.toLocaleString()); }

// ---------- SVG map with pinch/drag zoom ----------
export function buildMap(box, region, onTap) {
  const R = GEO.regions[region]; const [vx, vy, VW, VH] = (R.vb || `0 0 ${GEO.W} ${GEO.H}`).split(' ').map(Number);
  const usa = region === 'usa';
  box.innerHTML = `<div class="mapwrap"><svg class="map" viewBox="${vx} ${vy} ${VW} ${VH}" data-testid="map">
    <rect x="${vx - 2000}" y="${vy - 2000}" width="${VW + 4000}" height="${VH + 4000}" class="sea"/>
    ${R.shapes.map(s => `<path d="${s.d}" data-id="${s.id}" class="c ${s.t ? 't' : 'n'}"${s.n ? ` data-n="${esc(s.n)}"` : ''}/>`).join('')}
    ${R.shapes.filter(s => s.dot).map(s => `<circle cx="${s.dot[0]}" cy="${s.dot[1]}" r="${usa ? 9 : 7}" data-id="${s.id}" class="dot"/>`).join('')}
  </svg><div class="zoombtns"><button data-z="in" aria-label="Zoom in">+</button><button data-z="out" aria-label="Zoom out">−</button><button data-z="reset" aria-label="Reset zoom">⟲</button></div></div>`;
  const svg = $('svg', box); let vb = { x: vx, y: vy, w: VW, h: VH };
  const apply = () => svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  const clamp = () => { vb.w = Math.min(VW, Math.max(VW / 8, vb.w)); vb.h = vb.w * VH / VW; vb.x = Math.min(vx + VW - vb.w, Math.max(vx, vb.x)); vb.y = Math.min(vy + VH - vb.h, Math.max(vy, vb.y)); apply(); };
  const zoomAt = (f, cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2) => { const nw = vb.w / f; vb.x = cx - (cx - vb.x) * (nw / vb.w); vb.y = cy - (cy - vb.y) * (nw / vb.w); vb.w = nw; clamp(); };
  $$('.zoombtns button', box).forEach(b => b.onclick = () => { sfx.tap(); if (b.dataset.z === 'in') zoomAt(1.6); else if (b.dataset.z === 'out') zoomAt(1 / 1.6); else { vb = { x: vx, y: vy, w: VW, h: VH }; apply(); } });
  const toSvg = (cx, cy) => { const r = svg.getBoundingClientRect(); const s = Math.max(vb.w / r.width, vb.h / r.height); const ox = (r.width * s - vb.w) / 2, oy = (r.height * s - vb.h) / 2; return [vb.x + (cx - r.left) * s - ox, vb.y + (cy - r.top) * s - oy]; };
  const pts = new Map(); let moved = false, start = null, pinch = null;
  svg.addEventListener('pointerdown', e => { svg.setPointerCapture && svg.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 1) { moved = false; start = { x: e.clientX, y: e.clientY, vb: { ...vb } }; } if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), w: vb.w }; moved = true; } });
  svg.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); const [cx, cy] = toSvg((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); zoomAt(vb.w / (pinch.w * pinch.d / d), cx, cy); return; }
    if (pts.size === 1 && start) { const dx = e.clientX - start.x, dy = e.clientY - start.y; if (Math.hypot(dx, dy) > 10) moved = true; if (moved && vb.w < VW) { const r = svg.getBoundingClientRect(); const s = Math.max(vb.w / r.width, vb.h / r.height); vb.x = start.vb.x - dx * s; vb.y = start.vb.y - dy * s; clamp(); } }
  });
  const up = e => {
    const wasSingle = pts.size === 1; pts.delete(e.pointerId); if (pts.size < 2) pinch = null;
    if (wasSingle && !moved && e.type === 'pointerup') { const hit = document.elementFromPoint(e.clientX, e.clientY); const t = hit && hit.closest('[data-id]'); if (t && svg.contains(t)) onTap(t.dataset.id, t); }
    if (!pts.size) start = null;
  };
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
  svg.addEventListener('wheel', e => { e.preventDefault(); const [cx, cy] = toSvg(e.clientX, e.clientY); zoomAt(e.deltaY < 0 ? 1.25 : 0.8, cx, cy); }, { passive: false });
  return {
    svg, mark(id, cls) { $$(`[data-id="${id}"]`, svg).forEach(p => p.classList.add(cls)); },
    unmark(id, cls) { $$(`[data-id="${id}"]`, svg).forEach(p => p.classList.remove(cls)); },
    flash(id, cls, ms = 600) { this.mark(id, cls); setTimeout(() => this.unmark(id, cls), ms); },
  };
}

// ---------- find-it run ----------
route('mapplay', (view, { region, n, lvl = 1, ids }) => {
  const usa = region === 'usa'; const R = GEO.regions[region];
  let pool = R.shapes.filter(s => s.t).map(s => s.id);
  const tierOf = id => usa ? ST[id].t : C[id].t;
  // Easy: famous ones. Medium: tiers 1-2. Hard/Expert: everything (Expert picks the hardest first).
  const cap = region === 'world' ? (lvl >= 3 ? 3 : lvl === 2 ? 2 : (n ? 2 : 1)) : (lvl >= 3 ? 3 : lvl);
  const lim = pool.filter(id => tierOf(id) <= cap); if (lim.length >= Math.min(10, pool.length)) pool = lim;
  let targets = shuffle(pool).slice(0, n || pool.length);
  if (lvl === 4 && n) { const hard = shuffle(pool.filter(id => tierOf(id) === 3)); targets = shuffle([...hard.slice(0, 7), ...shuffle(pool.filter(id => !hard.slice(0, 7).includes(id)))].slice(0, n)); }
  if (ids) targets = shuffle(ids.slice());
  const maxTries = lvl === 4 ? 1 : lvl === 3 ? 2 : 3;
  const key = ids ? null : mapKey(region, n, lvl); const log = [];
  const best = key && S.bests[key] && S.bests[key].time;
  let wrongs = []; let i = 0, tries = 0, firstTry = 0, t0 = performance.now(), tick = null, busy = false;
  view.innerHTML = `${topbar((ids ? '🔁 ' : '') + 'Find it: ' + RNAME[region] + (lvl > 1 ? ' · ' + LEVELS[lvl - 1] : ''), 'geo', `<div class="hud"><span class="pill" data-testid="qcount"></span><span class="pill time" data-testid="clock">0.0s</span></div>`)}
    <div class="progress"><i></i></div>
    <div class="prompt card" data-testid="prompt"><span class="pflag"></span><span class="pname"></span>${best ? `<small class="ghost">Best ${fmtTime(best)}</small>` : ''}</div>
    <div class="mapbox"></div>`;
  const map = buildMap($('.mapbox', view), region, tap);
  const clock = $('[data-testid=clock]', view);
  tick = setInterval(() => { const el = performance.now() - t0; clock.textContent = fmtTime(el); if (best) clock.classList.toggle('ahead', el / Math.max(i, 0.5) <= best / targets.length); }, 100);
  onCleanup(() => clearInterval(tick));
  function show() {
    const id = targets[i]; tries = 0; busy = false; wrongs = [];
    $('.pname', view).textContent = nameOf(id, usa); $('.pflag', view).innerHTML = usa || lvl === 4 ? '' : flagImg(id, 'pflagimg');
    $('[data-testid=qcount]', view).textContent = (i + 1) + '/' + targets.length; $('.progress i', view).style.width = (i / targets.length * 100) + '%';
    hook.target = () => id;
  }
  function tap(id, el) {
    if (busy) return; const want = targets[i];
    if (id === want) {
      busy = true; sfx.good(); if (tries === 0) { firstTry++; fixed(usa ? 'state' : 'geo', want); }
      log.push({ id: want, ok: tries === 0, wrong: wrongs.slice() });
      map.mark(want, tries === 0 ? 'done' : 'late'); next(); return;
    }
    tries++; sfx.bad(); map.flash(id, 'wrong');
    const nm = nameOf(id, usa) || (el && el.dataset.n); if (nm) toast("That's " + nm, 1100); wrongs.push(nm || '?');
    if (tries >= maxTries) { busy = true; log.push({ id: want, ok: false, wrong: wrongs.slice(), shown: true }); miss(usa ? 'state' : 'geo', want); map.mark(want, 'reveal'); setTimeout(() => { map.unmark(want, 'reveal'); map.mark(want, 'missed'); next(); }, 1300); }
  }
  function next() { i++; if (i >= targets.length) done(); else setTimeout(show, 150); }
  function done() {
    clearInterval(tick); const time = performance.now() - t0; const acc = Math.round(firstTry / targets.length * 100);
    bump('mapRuns'); S.stats['map_' + region] = 1; if (region === 'usa' && !n) S.stats.map_usa_full = 1;
    if (n === 10 && time < 30000 && acc >= 80) bump('fastSprint');
    setReview(mapReview(region, usa, log, lvl));
    finishRound(view, { key: key && acc >= 70 ? key : null, title: 'Find it: ' + RNAME[region], back: 'geo', again: () => go('mapplay', { region, n, lvl, ids }), time, acc, total: targets.length, bestBy: 'time', big: fmtTime(time), xp: firstTry * 12 + (acc >= 90 ? 30 : 0), lines: [['Accuracy', acc + '%'], ['First-try taps', firstTry + '/' + targets.length]] });
  }
  show();
});

// Review for a map run: a map coloured by result, and a list you can tap to flash each place.
function mapReview(region, usa, log, lvl) {
  const missed = log.filter(x => !x.ok).map(x => x.id);
  const items = log.map(x => {
    const where = usa ? '' : (C[x.id].sub || RNAME[C[x.id].r]);
    return { ok: x.ok, id: x.id, html_full: `<div class="rvq">${usa ? '' : flagImg(x.id, 'miniflag')} <b>${esc(nameOf(x.id, usa))}</b>${where ? ` <small class="muted">📍 ${esc(where)}</small>` : ''}</div>
      <div class="rva">${x.ok ? '<span>✓ Found it on the first tap</span>' : `<span class="mine">Your taps: ${x.wrong.length ? esc(x.wrong.join(', ')) : 'found it after a miss'}</span><span class="right">Correct place: ${esc(nameOf(x.id, usa))}${x.shown ? ' (it was shown to you)' : ''}</span>`}</div>
      <button class="btn small rvshow" data-show="${x.id}" data-testid="show-on-map">📍 Show on map</button>` };
  });
  return { items, top: '<p class="muted center">🟢 first try · 🟠 found after a miss · 🔴 missed. Tap 📍 to see where it is.</p><div class="mapbox rvmap" data-testid="review-map"></div>',
    retry: missed.length ? () => go('mapplay', { region, n: missed.length, lvl, ids: missed }) : null,
    wire(view) {
      const box = $('[data-testid=review-map]', view); const map = buildMap(box, region, () => {});
      log.forEach(x => map.mark(x.id, x.ok ? 'done' : x.shown ? 'missed' : 'late'));
      $$('.rvshow', view).forEach(b => b.onclick = () => { sfx.tap(); box.scrollIntoView({ behavior: 'smooth', block: 'center' }); map.flash(b.dataset.show, 'reveal', 2200); });
    } };
}

// ---------- flags ----------
function regionPeers(id, all) { const r = C[id].r; return all.filter(x => x !== id && C[x].r === r); }
function distractors(id, lvl, all) {
  let pool = [];
  if (lvl >= 3) { const g = LOOK.find(g => g.includes(id)); if (g) pool = shuffle(g.filter(x => x !== id && C[x])); }
  if (lvl >= 2) pool = pool.concat(shuffle(regionPeers(id, all)));
  pool = pool.concat(shuffle(all.filter(x => x !== id)));
  return [...new Set(pool)].slice(0, 3);
}
route('flagquiz', (view, { lvl }) => {
  const all = Object.keys(C); let usable = all.filter(id => C[id].t <= lvl);
  if (lvl === 4) { const rare = all.filter(id => C[id].t === 3); usable = [...rare, ...shuffle(all.filter(id => LOOK.some(g => g.includes(id)) && C[id].t < 3)).slice(0, 12)]; }
  const pick = pickWithRematch(usable, 'flag', 10);
  const qs = pick.map((id, k) => {
    const wr = distractors(id, lvl, all);
    if (k % 2 === 0 && lvl < 4 || lvl === 4 && k % 3 === 0) return { ...mc('Which country has this flag?', C[id].n, wr.map(x => C[x].n)), img: flagImg(id, 'bigflag'), why: C[id].n + (C[id].cap ? ' · capital: ' + C[id].cap : ''), kind: 'flag', id };
    const q = mc('Tap the flag of <b>' + esc(C[id].n) + '</b>', id, wr); q.choices = q.choices.map(c => flagImg(c, 'choiceflag')); q.flags = true; q.kind = 'flag'; q.id = id; return q;
  });
  runQuiz(view, { title: '🚩 Flag Frenzy', back: 'geo', questions: qs, time: [0, 12, 11, 9, 6][lvl], onRight: () => bump('flagsRight'),
    onDone: r => finishRound(view, { key: 'flags_' + lvl, title: '🚩 Flag Frenzy', back: 'geo', again: () => go('flagquiz', { lvl }), score: r.score, acc: r.acc, total: r.total, xp: r.right * 10 + r.score / 200, lines: [['Right', r.right + '/' + r.total], ['Best combo', '🔥 ' + r.maxCombo]] }) });
});

// ---------- capitals ----------
route('capquiz', (view, { lvl, usa }) => {
  let qs;
  if (usa) {
    const all = Object.keys(ST); const usable = all.filter(id => lvl === 4 ? ST[id].t >= 2 : ST[id].t <= lvl);
    qs = pickWithRematch(usable, 'statecap', 10).map(id => {
      const traps = lvl >= 2 ? (TRAP[id] || []) : []; const others = shuffle(all.filter(x => x !== id)).map(x => ST[x].cap).filter(c => c !== ST[id].cap);
      if (lvl === 4) { const rev = Math.random() < 0.4; const wr = shuffle(all.filter(x => x !== id)).slice(0, 3);
        if (rev) return { ...mc('<b>' + esc(ST[id].cap) + '</b> is the capital of...', ST[id].n, wr.map(x => ST[x].n)), why: ST[id].cap + ' is the capital of ' + ST[id].n + '.', kind: 'statecap', id };
        return { ...mc('Capital of <b>' + esc(ST[id].n) + '</b>?', ST[id].cap, [...new Set([...(TRAP[id] || []), ...others])].slice(0, 3)), why: ST[id].cap + ' is the capital of ' + ST[id].n + '.', kind: 'statecap', id }; }
      return { ...mc('Capital of <b>' + esc(ST[id].n) + '</b>?', ST[id].cap, [...new Set([...traps, ...others])].slice(0, 3)), why: ST[id].cap + ' is the capital of ' + ST[id].n + '.', kind: 'statecap', id };
    });
  } else {
    const all = Object.keys(C).filter(id => C[id].cap); const usable = lvl === 4 ? all.filter(id => C[id].t === 3) : all.filter(id => C[id].t <= lvl);
    qs = pickWithRematch(usable, 'cap', 10).map((id, k) => {
      const wr = distractors(id, Math.max(lvl, 2), all);
      if (lvl >= 2 && k % 3 === 2 || lvl === 4 && k % 2 === 1) return { ...mc('<b>' + esc(C[id].cap) + '</b> is the capital of...', C[id].n, wr.map(x => C[x].n)), img: '', why: C[id].cap + ' → ' + C[id].n, kind: 'cap', id };
      return { ...mc('Capital of <b>' + esc(C[id].n) + '</b>?', C[id].cap, wr.map(x => C[x].cap)), sub: lvl === 4 ? '' : flagImg(id, 'miniflag'), why: C[id].cap + ' is the capital of ' + C[id].n + '.', kind: 'cap', id };
    });
  }
  const title = usa ? '🏛️ State Capitals' : '🏛️ Capital Clash'; const key = (usa ? 'caps_usa_' : 'caps_') + lvl;
  runQuiz(view, { title, back: 'geo', questions: qs, time: [0, 13, 12, 10, 7][lvl], onRight: () => bump('capsRight'),
    onDone: r => finishRound(view, { key, title, back: 'geo', again: () => go('capquiz', { lvl, usa }), score: r.score, acc: r.acc, total: r.total, xp: r.right * 10 + r.score / 200, lines: [['Right', r.right + '/' + r.total], ['Best combo', '🔥 ' + r.maxCombo]] }) });
});
// Put up to 3 previously-missed items into a round, then fill with fresh ones.
export function pickWithRematch(pool, kind, n) {
  const m = (S.missed[kind] || []).filter(id => pool.includes(id)); const fromMiss = shuffle(m).slice(0, 3);
  return shuffle([...fromMiss, ...shuffle(pool.filter(x => !fromMiss.includes(x))).slice(0, n - fromMiss.length)]);
}

// ---------- explore ----------
route('explore', (view, { region }) => {
  const usa = region === 'usa'; S.seen.explored = S.seen.explored || {};
  view.innerHTML = `${topbar('🔭 Explore ' + RNAME[region], 'geo')}${usa ? '' : `<div class="chips">${REGIONS.map(r => `<button class="chip ${r === region ? 'on' : ''}" data-r="${r}">${RNAME[r]}</button>`).join('')}</div>`}
    <div class="mapbox"></div><div class="info card" data-testid="info"><p>Tap anywhere on the map.</p></div>`;
  $$('.chip[data-r]', view).forEach(b => b.onclick = () => go('explore', { region: b.dataset.r }));
  let last = null;
  const map = buildMap($('.mapbox', view), region, (id, el) => {
    sfx.tap(); if (last) map.unmark(last, 'sel'); map.mark(id, 'sel'); last = id;
    const info = $('.info', view);
    if (usa && ST[id]) { const s = ST[id]; info.innerHTML = `<h3>${esc(s.n)} <small>${id}</small></h3><p>🏛️ Capital: <b>${esc(s.cap)}</b></p>`; }
    else if (C[id]) { const c = C[id]; S.seen.explored[id] = 1; save(); info.innerHTML = `<div class="row">${flagImg(id, 'infoflag')}<div><h3>${esc(c.n)}</h3><p>🏛️ Capital: <b>${esc(c.cap || 'more than one city')}</b></p><p>📍 ${esc(c.sub || RNAME[c.r])}${c.land ? ' · no coastline' : ''}</p></div></div>`; }
    else info.innerHTML = `<h3>${esc((el && el.dataset.n) || 'Unknown')}</h3><p>Not in the quiz yet.</p>`;
  });
});
