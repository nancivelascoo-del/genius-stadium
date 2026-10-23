// Core: saved progress, XP/levels, streaks, badges, sound, small UI helpers, router.
import { LEVEL_TITLES } from './content.js';

const KEY = 'genius-stadium-v1';
const fresh = () => ({
  xp: 0, streak: { count: 0, last: null, shields: 0, best: 0 }, bests: {}, badges: {}, stats: {},
  facts: [], daily: { date: null, done: false, score: 0 }, lessons: {}, ladder: 0, missed: {}, muted: false, seen: {},
});
export let S = load();
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && typeof s === 'object') return Object.assign(fresh(), s); } catch (e) { /* ignore */ }
  return fresh();
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage full or private mode */ } }
export function resetAll() { S = fresh(); save(); }

// ---------- dates ----------
export function today(d = new Date()) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
export function dayNumber(d = new Date()) { return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); }
function daysBetween(a, b) { const pa = a.split('-').map(Number), pb = b.split('-').map(Number); return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000); }

// ---------- streak (any finished round counts for the day) ----------
export function touchStreak() {
  const t = today(), st = S.streak; let msg = null;
  if (st.last === t) return null;
  const gap = st.last ? daysBetween(st.last, t) : 99;
  if (gap === 1) st.count++;
  else if (st.last && gap > 1 && gap - 1 <= st.shields) { st.shields -= gap - 1; st.count++; msg = '🛡️ Streak shield saved your streak!'; }
  else st.count = 1;
  st.last = t; st.best = Math.max(st.best || 0, st.count);
  if (st.count % 7 === 0 && st.shields < 2) { st.shields++; msg = '🛡️ ' + st.count + '-day streak! You earned a streak shield.'; }
  save(); return msg;
}
export function streakAlive() { const st = S.streak; if (!st.last) return 0; const gap = daysBetween(st.last, today()); return gap <= 1 + st.shields ? st.count : 0; }

// ---------- XP + levels ----------
export function levelFor(xp) { let lvl = 1, need = 150, total = 0; while (xp >= total + need) { total += need; lvl++; need = 150 + (lvl - 1) * 75; } return { lvl, into: xp - total, need }; }
export function titleFor(lvl) { const i = Math.min(lvl - 1, LEVEL_TITLES.length - 1); const extra = lvl - LEVEL_TITLES.length; return LEVEL_TITLES[i] + (extra > 0 ? ' ' + (extra + 1) : ''); }
export function addXP(n) { const before = levelFor(S.xp).lvl; S.xp += Math.max(0, Math.round(n)); save(); const after = levelFor(S.xp).lvl; return after > before ? after : 0; }
export function bump(stat, n = 1) { S.stats[stat] = (S.stats[stat] || 0) + n; save(); return S.stats[stat]; }
export function setMax(stat, v) { if (!(S.stats[stat] >= v)) { S.stats[stat] = v; save(); } }

// personal bests: lower time is better for 'time', higher for score
export function recordBest(key, { time, score, acc }) {
  const b = S.bests[key] || {}; const isNew = {};
  if (time != null && (b.time == null || time < b.time)) { b.time = time; isNew.time = true; }
  if (score != null && (b.score == null || score > b.score)) { b.score = score; isNew.score = true; }
  if (acc != null && (b.acc == null || acc > b.acc)) { b.acc = acc; }
  b.plays = (b.plays || 0) + 1; S.bests[key] = b; save(); return { prev: b, isNew };
}

// missed items come back later ("Rematch")
export function miss(kind, id) { const m = S.missed[kind] || (S.missed[kind] = []); if (!m.includes(id)) m.push(id); if (m.length > 40) m.shift(); save(); }
export function fixed(kind, id) { const m = S.missed[kind]; if (!m) return; const i = m.indexOf(id); if (i >= 0) { m.splice(i, 1); bump('fixed'); save(); } }
export function missedCount() { return Object.values(S.missed).reduce((a, m) => a + m.length, 0); }

// ---------- badges ----------
export const BADGES = [
  { id: 'first', e: '🚀', n: 'Kickoff', d: 'Finish your first round', ok: () => (S.stats.rounds || 0) >= 1 },
  { id: 'rounds25', e: '🏃', n: 'Marathon Brain', d: 'Finish 25 rounds', ok: () => (S.stats.rounds || 0) >= 25 },
  { id: 'perfect', e: '💯', n: 'Perfect Round', d: 'Get 100% in a round of 10+', ok: () => (S.stats.perfect || 0) >= 1 },
  { id: 'combo10', e: '🔥', n: 'On Fire', d: '10 right answers in a row', ok: () => (S.stats.bestCombo || 0) >= 10 },
  { id: 'globe', e: '🌍', n: 'Globe Trotter', d: 'Finish a map run on every continent', ok: () => ['europe', 'africa', 'asia', 'namerica', 'samerica', 'oceania'].every(r => S.stats['map_' + r]) },
  { id: 'usa50', e: '🦅', n: 'All 50', d: 'Finish the full USA map', ok: () => !!S.stats.map_usa_full },
  { id: 'flags', e: '🚩', n: 'Flag Spotter', d: 'Get 50 flags right', ok: () => (S.stats.flagsRight || 0) >= 50 },
  { id: 'caps', e: '🏛️', n: 'Capital Crusher', d: 'Get 50 capitals right', ok: () => (S.stats.capsRight || 0) >= 50 },
  { id: 'speed', e: '⚡', n: 'Speed Demon', d: 'Finish a 10-country sprint in under 30 seconds', ok: () => (S.stats.fastSprint || 0) >= 1 },
  { id: 'mate', e: '♚', n: 'Checkmate!', d: 'Solve your first checkmate puzzle', ok: () => (S.stats.mates || 0) >= 1 },
  { id: 'mate2', e: '🧠', n: 'Two Moves Ahead', d: 'Solve 5 mate-in-2 puzzles', ok: () => (S.stats.mate2 || 0) >= 5 },
  { id: 'lessons', e: '🎓', n: 'Chess Scholar', d: 'Finish every chess lesson', ok: () => (S.stats.lessonsDone || 0) >= 6 },
  { id: 'sprint10', e: '⏱️', n: 'Tactic Sprinter', d: 'Solve 10 puzzles in one Tactic Sprint', ok: () => (S.stats.bestSprint || 0) >= 10 },
  { id: 'golden', e: '🥅', n: 'Golden Boot', d: 'Score 5 out of 5 penalties', ok: () => (S.stats.perfectShootout || 0) >= 1 },
  { id: 'soccer50', e: '⚽', n: 'Soccer Brain', d: 'Get 50 soccer questions right', ok: () => (S.stats.soccerRight || 0) >= 50 },
  { id: 'fib15', e: '🕵️', n: 'Fib Detector', d: 'Score 15+ in one Fact or Fib blitz', ok: () => (S.stats.bestFib || 0) >= 15 },
  { id: 'vault10', e: '🔐', n: 'Fact Collector', d: 'Unlock 10 facts in the Fact Vault', ok: () => S.facts.length >= 10 },
  { id: 'daily', e: '📅', n: 'Daily Doer', d: 'Finish a Daily Mix', ok: () => (S.stats.dailies || 0) >= 1 },
  { id: 'streak3', e: '🔥', n: '3-Day Streak', d: 'Play 3 days in a row', ok: () => (S.streak.best || 0) >= 3 },
  { id: 'streak7', e: '🌟', n: 'Week Warrior', d: 'Play 7 days in a row', ok: () => (S.streak.best || 0) >= 7 },
  { id: 'rematch', e: '♻️', n: 'Comeback Kid', d: 'Fix 10 things you missed before', ok: () => (S.stats.fixed || 0) >= 10 },
  { id: 'lvl5', e: '🥈', n: 'Level 5', d: 'Reach level 5', ok: () => levelFor(S.xp).lvl >= 5 },
  { id: 'lvl10', e: '🥇', n: 'Level 10', d: 'Reach level 10', ok: () => levelFor(S.xp).lvl >= 10 },
];
export function checkBadges() { const got = []; for (const b of BADGES) if (!S.badges[b.id] && b.ok()) { S.badges[b.id] = today(); got.push(b); } if (got.length) save(); return got; }

// ---------- sound (tiny synth, no files) ----------
let ac = null;
function ctx() { if (!ac) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ac = new A(); } if (ac.state === 'suspended') ac.resume(); return ac; }
function tone(freq, start, dur, type = 'sine', vol = 0.18) {
  const c = ctx(); if (!c) return; const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + start + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(c.destination); o.start(c.currentTime + start); o.stop(c.currentTime + start + dur + 0.05);
}
function noise(dur, vol = 0.12) { const c = ctx(); if (!c) return; const b = c.createBuffer(1, c.sampleRate * dur, c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length); const s = c.createBufferSource(); s.buffer = b; const g = c.createGain(); g.gain.value = vol; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; s.connect(f).connect(g).connect(c.destination); s.start(); }
export const sfx = {
  tap() { if (!S.muted) tone(660, 0, 0.06, 'triangle', 0.08); },
  good() { if (!S.muted) { tone(660, 0, 0.12, 'triangle'); tone(990, 0.09, 0.18, 'triangle'); } },
  bad() { if (!S.muted) { tone(200, 0, 0.22, 'sawtooth', 0.1); } },
  win() { if (!S.muted) [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.25, 'triangle')); },
  goal() { if (!S.muted) { noise(1.2, 0.18); tone(784, 0, 0.2, 'square', 0.06); tone(1047, 0.15, 0.3, 'square', 0.06); } },
  move() { if (!S.muted) tone(320, 0, 0.05, 'square', 0.06); },
  level() { if (!S.muted) [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.08, 0.3, 'triangle', 0.14)); },
};

// ---------- UI helpers ----------
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
export function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export function seeded(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function fmtTime(ms) { const s = ms / 1000; return s < 60 ? s.toFixed(1) + 's' : Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'); }
export function toast(msg, ms = 2200) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; $('#toasts').appendChild(t);
  setTimeout(() => t.classList.add('out'), ms); setTimeout(() => t.remove(), ms + 400);
}
export function confetti(n = 40) {
  const box = $('#fx'); if (!box) return;
  for (let i = 0; i < n; i++) { const p = document.createElement('i'); p.className = 'cf'; p.style.left = Math.random() * 100 + 'vw'; p.style.background = ['#c6ff3d', '#ffd166', '#4cc9f0', '#f72585', '#fff'][i % 5]; p.style.animationDelay = Math.random() * 0.3 + 's'; p.style.transform = 'rotate(' + Math.random() * 360 + 'deg)'; box.appendChild(p); setTimeout(() => p.remove(), 1800); }
}

// ---------- router ----------
const routes = {};
let cleanup = null;
export function route(name, fn) { routes[name] = fn; }
export function go(name, params = {}) {
  if (cleanup) { try { cleanup(); } catch (e) { console.warn(e); } cleanup = null; }
  document.querySelectorAll('body > .modal').forEach(m => m.remove());
  const view = $('#view'); view.innerHTML = ''; view.className = 'view view-' + name; window.scrollTo(0, 0);
  const fn = routes[name] || routes.home;
  const c = fn(view, params); if (typeof c === 'function') cleanup = c;
  document.body.dataset.screen = name;
  if (location.hash !== '#' + name && ['home', 'geo', 'chess', 'soccer', 'facts', 'daily', 'trophies'].includes(name)) history.replaceState(null, '', '#' + name);
}
export function onCleanup(fn) { const prev = cleanup; cleanup = () => { if (prev) prev(); fn(); }; }

// Shared top bar for sub-screens
export function topbar(title, back = 'home', extra = '') {
  return `<header class="bar"><button class="back" data-testid="back" data-go="${back}" aria-label="Back">‹</button><h1>${title}</h1>${extra}</header>`;
}
// Delegate all [data-go] buttons
document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) { sfx.tap(); go(b.dataset.go, b.dataset.params ? JSON.parse(b.dataset.params) : {}); } });

// Test hook (only when ?test is in the URL)
export const TEST = /[?&]test\b/.test(location.search);
export const hook = {};
if (TEST) window.__gs = hook;
