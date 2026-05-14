/* ═══════════════════════════════════════════════
   ROBONEXUS — SCRIPT.JS
═══════════════════════════════════════════════ */

/* ── 1. NAV: scroll + mobile burger ── */
const nav    = document.getElementById('nav');
const burger = document.getElementById('burger');
const links  = document.querySelector('.nav__links');

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20);
});

burger.addEventListener('click', () => {
  links.classList.toggle('open');
});

document.querySelectorAll('.nav__link').forEach(l =>
  l.addEventListener('click', () => links.classList.remove('open'))
);

/* ── 2. SMOOTH SCROLL ── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = document.getElementById('nav').offsetHeight;
    window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
  });
});

/* ── 3. TYPED TEXT ── */
const phrases = [
  'Строим автономные системы.',
  'Оживляем механику данными.',
  'От прототипа до производства.',
  'Интеллект в каждом движении.',
];
let phraseIdx = 0, charIdx = 0, deleting = false;
const typedEl = document.getElementById('typed-text');

function type() {
  if (!typedEl) return;
  const phrase = phrases[phraseIdx];
  if (!deleting) {
    typedEl.textContent = phrase.slice(0, ++charIdx);
    if (charIdx === phrase.length) { deleting = true; setTimeout(type, 1800); return; }
  } else {
    typedEl.textContent = phrase.slice(0, --charIdx);
    if (charIdx === 0) { deleting = false; phraseIdx = (phraseIdx + 1) % phrases.length; }
  }
  setTimeout(type, deleting ? 45 : 80);
}
type();

/* ── 4. HERO PARTICLES ── */
(function spawnParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('div');
    const size = Math.random() * 2.5 + 1;
    const dur  = Math.random() * 10 + 8;
    const del  = Math.random() * 12;
    const x    = Math.random() * 100;
    Object.assign(p.style, {
      position: 'absolute',
      width: size + 'px', height: size + 'px',
      borderRadius: '50%',
      background: Math.random() > .5 ? 'var(--c-accent)' : 'var(--c-accent2)',
      opacity: (Math.random() * .5 + .1).toFixed(2),
      left: x + '%',
      top: (Math.random() * 100) + '%',
      animation: `floatUp ${dur}s ${del}s linear infinite`,
    });
    container.appendChild(p);
  }
  const style = document.createElement('style');
  style.textContent = `
    @keyframes floatUp {
      0%   { transform: translateY(0) scale(1);   opacity: .4; }
      50%  { opacity: .15; }
      100% { transform: translateY(-220px) scale(.4); opacity: 0; }
    }`;
  document.head.appendChild(style);
})();

/* ── 5. REVEAL ON SCROLL ── */
function addReveal() {
  document.querySelectorAll('.card').forEach((el, i) => {
    el.classList.add('reveal', `reveal-delay-${(i % 4) + 1}`);
  });
  document.querySelectorAll(
    '.section-header, .stack__category, .stack__bar-chart, .viz__wrapper'
  ).forEach(el => el.classList.add('reveal'));
}
addReveal();

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* ── 6. BAR CHART ANIMATION ── */
const barObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.querySelectorAll('.stack__bar-fill').forEach(bar => {
      bar.style.width = bar.style.getPropertyValue('--w') || bar.getAttribute('style').match(/--w:([\d%]+)/)?.[1] || '0';
    });
  });
}, { threshold: 0.3 });
const barChart = document.querySelector('.stack__bar-chart');
if (barChart) barObserver.observe(barChart);

/* ── 7. ROBOT CANVAS ANIMATION ── */
const canvas = document.getElementById('robotCanvas');
const ctx    = canvas ? canvas.getContext('2d') : null;

const W = 520, H = 420;
if (canvas) { canvas.width = W; canvas.height = H; }

// Robot arm state
const arm = {
  base: { x: W / 2, y: H - 60 },
  seg: [
    { len: 100, angle: -Math.PI / 2.2, dAngle: .008 },
    { len: 80,  angle:  Math.PI / 5,   dAngle: -.011 },
    { len: 55,  angle: -Math.PI / 4,   dAngle: .015 },
  ],
  bounds: [
    [-Math.PI * .85, -Math.PI * .15],
    [-Math.PI * .6,   Math.PI * .6 ],
    [-Math.PI * .7,   Math.PI * .7 ],
  ],
  dirs: [1, 1, 1],
};

const ACCENT  = '#00d4ff';
const ACCENT2 = '#ff6b35';
const ACCENT3 = '#00ff9d';
const BG      = '#0c1520';

let running  = true;
let frameId  = null;
let logTimer = 0;

const logMessages = [
  '> JOINT 1 — OK',
  '> JOINT 2 — OK',
  '> JOINT 3 — OK',
  '> ТРАЕКТОРИЯ РАССЧИТАНА',
  '> СЕНСОР: 0 ПОМЕХ',
  '> ЦПУ: 12%',
  '> ОБНОВЛЕНИЕ ПОЗИЦИИ',
];
const vizLog = document.getElementById('viz-log');

function addLog(msg, ok = false) {
  if (!vizLog) return;
  const div = document.createElement('div');
  div.className = 'viz__log-entry' + (ok ? ' viz__log-entry--ok' : '');
  div.textContent = msg;
  vizLog.appendChild(div);
  if (vizLog.children.length > 18) vizLog.removeChild(vizLog.firstChild);
  vizLog.scrollTop = vizLog.scrollHeight;
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(0,212,255,.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
}

function drawBase(x, y) {
  // Platform
  ctx.fillStyle = '#111e2a';
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x - 45, y, 90, 18, 3);
  ctx.fill(); ctx.stroke();

  // Base circle
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.fillStyle = '#0d1b28';
  ctx.fill();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Inner dot
  ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fillStyle = ACCENT; ctx.fill();

  // Rotation ring (animated)
  const t = Date.now() / 1000;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * .8);
  ctx.strokeStyle = 'rgba(0,212,255,.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 8]);
  ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawSegment(x1, y1, x2, y2, color, w = 14) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const hw = w / 2;
  const cos = Math.cos(angle + Math.PI / 2);
  const sin = Math.sin(angle + Math.PI / 2);

  ctx.beginPath();
  ctx.moveTo(x1 + cos * hw, y1 + sin * hw);
  ctx.lineTo(x2 + cos * hw * .7, y2 + sin * hw * .7);
  ctx.lineTo(x2 - cos * hw * .7, y2 - sin * hw * .7);
  ctx.lineTo(x1 - cos * hw, y1 - sin * hw);
  ctx.closePath();
  ctx.fillStyle = '#0c1826';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Centre line
  ctx.strokeStyle = color + '55';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

function drawJoint(x, y, color, r = 8) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#0d1b28'; ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, r * .4, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
}

function drawEndEffector(x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Gripper body
  ctx.fillStyle = '#0d1b28';
  ctx.strokeStyle = ACCENT2;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(-8, -4, 16, 8, 2); ctx.fill(); ctx.stroke();

  // Gripper fingers (open/close animation)
  const t = Date.now() / 1000;
  const open = (Math.sin(t * 1.2) + 1) / 2 * 6 + 2;
  [[1], [-1]].forEach(([s]) => {
    ctx.beginPath();
    ctx.moveTo(8, s * 4);
    ctx.lineTo(8 + 10, s * open);
    ctx.strokeStyle = ACCENT2;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath(); ctx.arc(8 + 10, s * open, 2, 0, Math.PI * 2);
    ctx.fillStyle = ACCENT2; ctx.fill();
  });

  // Laser dot
  const pulse = Math.abs(Math.sin(Date.now() / 400)) * .8 + .2;
  ctx.beginPath();
  ctx.arc(18, 0, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,107,53,${pulse})`;
  ctx.fill();

  ctx.restore();
}

function drawWorkspace() {
  // Dashed arc showing workspace
  ctx.save();
  ctx.translate(arm.base.x, arm.base.y);
  ctx.strokeStyle = 'rgba(0,212,255,.08)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 12]);
  const maxR = arm.seg.reduce((s, sg) => s + sg.len, 0);
  ctx.beginPath(); ctx.arc(0, 0, maxR, -Math.PI, 0); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, maxR * .4, -Math.PI, 0); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawCoords(pts) {
  if (pts.length < 2) return;
  const [tip] = pts.slice(-1);
  // Crosshair at end effector
  ctx.strokeStyle = 'rgba(0,255,157,.25)';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 6]);
  ctx.beginPath(); ctx.moveTo(tip.x, 0); ctx.lineTo(tip.x, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, tip.y); ctx.lineTo(W, tip.y); ctx.stroke();
  ctx.setLineDash([]);

  // Coordinates label
  const rx = Math.round(tip.x - arm.base.x);
  const ry = Math.round(arm.base.y - tip.y);
  ctx.fillStyle = 'rgba(0,255,157,.7)';
  ctx.font = '10px "Orbitron", monospace';
  ctx.fillText(`(${rx}, ${ry})`, tip.x + 10, tip.y - 6);
}

function render() {
  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  drawGrid();
  drawWorkspace();

  // Update joints
  arm.seg.forEach((sg, i) => {
    const [lo, hi] = arm.bounds[i];
    sg.angle += sg.dAngle * arm.dirs[i];
    if (sg.angle >= hi || sg.angle <= lo) arm.dirs[i] *= -1;
  });

  // Forward kinematics
  const pts = [{ x: arm.base.x, y: arm.base.y }];
  let absAngle = -Math.PI / 2;
  arm.seg.forEach(sg => {
    absAngle += sg.angle;
    const prev = pts[pts.length - 1];
    pts.push({
      x: prev.x + Math.cos(absAngle) * sg.len,
      y: prev.y + Math.sin(absAngle) * sg.len,
    });
  });

  // Draw shadow/glow
  ctx.shadowColor = ACCENT;
  ctx.shadowBlur = 8;

  // Draw segments
  const colors = [ACCENT, ACCENT, ACCENT2];
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i], p2 = pts[i + 1];
    const w = 18 - i * 3;
    drawSegment(p1.x, p1.y, p2.x, p2.y, colors[i] || ACCENT, w);
  }
  ctx.shadowBlur = 0;

  // Joints
  pts.forEach((p, i) => {
    if (i === 0) drawBase(p.x, p.y);
    else {
      const col = i === pts.length - 1 ? ACCENT2 : ACCENT;
      drawJoint(p.x, p.y, col, 10 - i);
    }
  });

  // End effector
  const tip    = pts[pts.length - 1];
  const prev   = pts[pts.length - 2];
  const tipAngle = Math.atan2(tip.y - prev.y, tip.x - prev.x);
  drawEndEffector(tip.x, tip.y, tipAngle);

  // Coordinate overlay
  drawCoords(pts);

  // HUD overlay — top-left
  ctx.fillStyle = 'rgba(0,212,255,.08)';
  ctx.fillRect(10, 10, 160, 80);
  ctx.strokeStyle = 'rgba(0,212,255,.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 10, 160, 80);
  ctx.fillStyle = 'rgba(0,212,255,.7)';
  ctx.font = '9px "Orbitron", monospace';
  ctx.fillText('ROBONEXUS ARM v2', 18, 28);
  ctx.fillStyle = 'rgba(0,212,255,.5)';
  ctx.fillText(`J1: ${(arm.seg[0].angle * 180 / Math.PI).toFixed(1)}°`, 18, 44);
  ctx.fillText(`J2: ${(arm.seg[1].angle * 180 / Math.PI).toFixed(1)}°`, 18, 58);
  ctx.fillText(`J3: ${(arm.seg[2].angle * 180 / Math.PI).toFixed(1)}°`, 18, 72);
  ctx.fillText('STATUS: RUNNING', 18, 82);

  // Update stat panel
  const valAngle = document.getElementById('val-angle');
  const valSpeed = document.getElementById('val-speed');
  if (valAngle) valAngle.textContent = `${Math.abs((arm.seg[0].angle * 180 / Math.PI)).toFixed(0)}°`;
  if (valSpeed) valSpeed.textContent = `${(Math.random() * .4 + 1.0).toFixed(1)} м/с`;

  if (running) frameId = requestAnimationFrame(render);
}

function startRobot() {
  if (!ctx) return;
  running = true;
  render();
  addLog('> ЗАПУСК СИСТЕМЫ...', false);
  setTimeout(() => addLog('> МОТОРЫ АКТИВИРОВАНЫ', true), 300);
  document.getElementById('val-status') && (document.getElementById('val-status').textContent = 'ACTIVE');
}

function stopRobot() {
  running = false;
  if (frameId) cancelAnimationFrame(frameId);
  addLog('> ОСТАНОВКА...', false);
  setTimeout(() => addLog('> СИСТЕМА ОСТАНОВЛЕНА', false), 200);
  document.getElementById('val-status') && (document.getElementById('val-status').textContent = 'IDLE');
}

document.getElementById('btn-play')?.addEventListener('click', () => {
  if (!running) startRobot();
});
document.getElementById('btn-stop')?.addEventListener('click', stopRobot);

// Auto-start when viz section is visible
const vizObserver = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting && !running) startRobot();
}, { threshold: 0.3 });
const vizSection = document.getElementById('viz');
if (vizSection) vizObserver.observe(vizSection);
startRobot();

// Log ticker
setInterval(() => {
  if (!running) return;
  logTimer = (logTimer + 1) % logMessages.length;
  addLog(logMessages[logTimer], logTimer < 3);
}, 2200);

/* ── 8. BARS ANIMATE ON LOAD ── */
// Trigger bars if already visible on first load
setTimeout(() => {
  const bars = document.querySelector('.stack__bar-chart');
  if (!bars) return;
  const rect = bars.getBoundingClientRect();
  if (rect.top < window.innerHeight) {
    bars.querySelectorAll('.stack__bar-fill').forEach(bar => {
      const match = bar.style.cssText.match(/--w:\s*([\d.%]+)/);
      if (match) bar.style.width = match[1];
    });
  }
}, 400);
