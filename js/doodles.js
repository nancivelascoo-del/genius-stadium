// Hand-drawn doodles for the home screen (sketchy marker style). All drawn here, no outside art.
const INK = '#1b1b2f';
const wrap = (body, cls = '') => `<svg class="doodle ${cls}" viewBox="0 0 64 64" aria-hidden="true"><g filter="url(#wob)" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
export const DOODLE = {
  globe: c => wrap(`<circle cx="32" cy="32" r="24" fill="#8fd3ff"/><path d="M14 22c8 4 12-2 18 2s4 10 10 10 8 6 8 6" fill="#7ee081"/><path d="M8.5 32h47M32 8c-10 10-10 38 0 48M32 8c10 10 10 38 0 48"/>`, c),
  pawn: c => wrap(`<circle cx="32" cy="17" r="8" fill="#c9b6ff"/><path d="M25 26h14l-3 6c2 6 4 12 8 16H20c4-4 6-10 8-16z" fill="#c9b6ff"/><path d="M14 56c0-6 4-8 18-8s18 2 18 8z" fill="#c9b6ff"/>`, c),
  ball: c => wrap(`<circle cx="32" cy="32" r="24" fill="#fff"/><path d="M32 22l9 7-3.5 10h-11L23 29z" fill="${INK}"/><path d="M32 22V9M41 29l12-4M37.5 39l7 10M26.5 39l-7 10M23 29l-12-4"/>`, c),
  bulb: c => wrap(`<path d="M32 8c-11 0-18 8-18 17 0 8 6 11 8 18h20c2-7 8-10 8-18 0-9-7-17-18-17z" fill="#ffe14d"/><path d="M23 48h18M24 53h16M28 58h8M32 43V30l-5-4M32 30l5-4"/>`, c),
  star: c => wrap(`<path d="M32 6l7 16 17 2-13 11 4 17-15-9-15 9 4-17L8 24l17-2z" fill="#ffe14d"/>`, c),
  cal: c => wrap(`<rect x="10" y="14" width="44" height="40" rx="6" fill="#fff"/><path d="M10 26h44M22 8v10M42 8v10" /><path d="M20 38l6 6 12-12" stroke="#e63946"/>`, c),
  trophy: c => wrap(`<path d="M20 10h24v12c0 10-6 16-12 16s-12-6-12-16z" fill="#ffd23f"/><path d="M20 14H10c0 10 6 12 10 12M44 14h10c0 10-6 12-10 12M32 38v8M22 56h20l-2-10H24z"/>`, c),
  arrow: c => wrap(`<path d="M8 40c14-18 30-22 44-14M44 18l8 8-10 6"/>`, c),
  squiggle: c => wrap(`<path d="M4 36c6-10 10-10 14 0s8 10 14 0 8-10 14 0 8 10 14 0"/>`, c),
};
export const WOBBLE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="wob" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="5"/><feDisplacementMap in="SourceGraphic" scale="2.4"/></filter></svg>`;
