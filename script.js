
const nav    = document.getElementById('nav');
const burger = document.getElementById('burger');
const links  = document.querySelector('.nav__links');

if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  });
}

if (burger && links) {
  burger.addEventListener('click', () => {
    links.classList.toggle('open');
  });
}

document.querySelectorAll('.nav__link').forEach(l => {
  l.addEventListener('click', () => {
    if (links) links.classList.remove('open');
  });
});


document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const navEl = document.getElementById('nav');
    const offset = navEl ? navEl.offsetHeight : 0;
    window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
  });
});


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
  setTimeout(type, deleting ? 35 : 70);
}
if (typedEl) type();


if (document.getElementById('particles')) {
  const container = document.getElementById('particles');
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
}


document.querySelectorAll('.card').forEach((el, i) => {
  el.classList.add('reveal', `reveal-delay-${(i % 4) + 1}`);
});
document.querySelectorAll('.section-header, .stack__category, .stack__bar-chart, .viz__wrapper').forEach(el => el.classList.add('reveal'));

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


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


const canvas = document.getElementById('robotCanvas');
const ctx    = canvas ? canvas.getContext('2d') : null;
const W = 520, H = 420;

if (canvas) {
  canvas.width = W;
  canvas.height = H;
}

const arm = {
  base: { x: W / 2, y: H - 55 },
  seg: [
    { len: 85, angle: -Math.PI/2, targetAngle: -Math.PI/2, speed: 0, maxSpeed: 0.012, accel: 0.0004 }, // Плечо
    { len: 70, angle: Math.PI/4,  targetAngle: Math.PI/4,  speed: 0, maxSpeed: 0.018, accel: 0.0006 }, // Предплечье
    { len: 50, angle: -Math.PI/3, targetAngle: -Math.PI/3, speed: 0, maxSpeed: 0.022, accel: 0.0008 }, // Локоть
    { len: 30, angle: Math.PI/6,  targetAngle: Math.PI/6,  speed: 0, maxSpeed: 0.028, accel: 0.0012 }  // Кисть/Захват
  ]
};

let trajectoryPath = []; // Следы кончика робота
let jointParticles = []; // Искры из суставов

const ACCENT  = '#00d4ff';
const ACCENT2 = '#ff6b35';
const JET_COLOR = '#00ff9d';
const BG      = '#0c1520';

let running  = true;
let frameId  = null;
let logTimer = 0;

const logMessages = [
  '> CONFIG: КИНЕМАТИЧЕСКАЯ СХЕМА ОБНОВЛЕНА [ОК]',
  '> СУСТАВЫ: ПОДКЛЮЧЕН СЕРВОПРИВОД J4 [АКТИВЕН]',
  '> РЕНДЕР: ИНИЦИАЛИЗАЦИЯ GLOW-ЭФФЕКТОВ [ОК]',
  '> ДАТЧИКИ: СЧИТЫВАНИЕ ТРАЕКТОРИИ ЭФФЕКТОРА',
  '> ТЕПЛОВИЗОР: ИНЖЕКЦИЯ ЧАСТИЦ СУСТАВОВ',
  '> СИСТЕМА ИМИТАЦИИ: КРИТИЧЕСКИХ ОШИБОК НЕТ',
  '> КАНАЛ СВЯЗИ: ТЕЛЕМЕТРИЯ СИНХРОНИЗИРОВАНА',
];
const vizLog = document.getElementById('viz-log');

function addLog(msg, ok = false) {
  if (!vizLog) return;
  const div = document.createElement('div');
  div.className = 'viz__log-entry' + (ok ? ' viz__log-entry--ok' : '');
  div.textContent = msg;
  vizLog.appendChild(div);
  if (vizLog.children.length > 14) vizLog.removeChild(vizLog.firstChild);
  vizLog.scrollTop = vizLog.scrollHeight;
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.025)';
  ctx.lineWidth = 1;
  ctx.shadowBlur = 0; // Сбрасываем свечение для фоновой сетки
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
}

function drawTrajectory() {
  if (trajectoryPath.length < 2) return;
  ctx.save();
  ctx.lineWidth = 2.5;
  ctx.shadowBlur = 8;
  ctx.shadowColor = ACCENT2;
  
  for (let i = 1; i < trajectoryPath.length; i++) {
    const p1 = trajectoryPath[i - 1];
    const p2 = trajectoryPath[i];
    const alpha = (i / trajectoryPath.length) * 0.4; // Плавное затухание старых точек
    ctx.strokeStyle = `rgba(255, 107, 53, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
  ctx.restore();
}

function emitJointParticle(x, y) {
  if (jointParticles.length > 120) return; // Ограничение пула ради высокой производительности
  jointParticles.push({
    x: x,
    y: y,
    vx: (Math.random() - 0.5) * 1.5,
    vy: (Math.random() - 0.2) * -1.5, // Летят преимущественно вверх и в стороны
    alpha: 1,
    size: Math.random() * 2 + 1
  });
}

function updateAndDrawParticles() {
  ctx.save();
  ctx.shadowBlur = 4;
  ctx.shadowColor = JET_COLOR;
  
  for (let i = jointParticles.length - 1; i >= 0; i--) {
    const p = jointParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 0.025;
    
    if (p.alpha <= 0) {
      jointParticles.splice(i, 1);
      continue;
    }
    
    ctx.fillStyle = `rgba(0, 255, 157, ${p.alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBase(x, y) {
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#111e2a';
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x - 60, y, 120, 18, 4);
  ctx.fill(); ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, 28, 0, Math.PI * 2);
  ctx.fillStyle = '#0d1b28';
  ctx.fill(); ctx.stroke();
}

function drawSegment(x1, y1, x2, y2, color, w = 14) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const hw = w / 2;
  const cos = Math.cos(angle + Math.PI / 2);
  const sin = Math.sin(angle + Math.PI / 2);

  ctx.save();
  ctx.shadowBlur = 10;
  ctx.shadowColor = color;

  ctx.beginPath();
  ctx.moveTo(x1 + cos * hw, y1 + sin * hw);
  ctx.lineTo(x2 + cos * hw * 0.7, y2 + sin * hw * 0.7);
  ctx.lineTo(x2 - cos * hw * 0.7, y2 - sin * hw * 0.7);
  ctx.lineTo(x1 - cos * hw, y1 - sin * hw);
  ctx.closePath();
  ctx.fillStyle = '#0a141f';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

function drawEndEffector(x, y, angle, openAmount) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.shadowBlur = 12;
  ctx.shadowColor = ACCENT2;

  ctx.fillStyle = '#0d1b28';
  ctx.strokeStyle = ACCENT2;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(-2, -6, 12, 12, 2); ctx.fill(); ctx.stroke();

  [[1], [-1]].forEach(([s]) => {
    ctx.beginPath();
    ctx.moveTo(10, s * 4);
    ctx.lineTo(18, s * openAmount);
    ctx.lineTo(25, s * (openAmount - 2.5));
    ctx.strokeStyle = ACCENT2;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  });

  ctx.shadowBlur = 15;
  ctx.shadowColor = '#00ff9d';
  ctx.beginPath();
  ctx.arc(10, 0, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = '#00ff9d';
  ctx.fill();
  ctx.restore();
}

function updatePhysics() {
  const time = Date.now() / 1400;
  
  arm.seg[0].targetAngle = -Math.PI/2 + Math.sin(time) * 0.45;
  arm.seg[1].targetAngle = Math.PI/4 + Math.cos(time * 0.7) * 0.35;
  arm.seg[2].targetAngle = -Math.PI/3 + Math.sin(time * 1.1) * 0.25;
  arm.seg[3].targetAngle = Math.cos(time * 1.8) * 0.3;

  arm.seg.forEach(sg => {
    let diff = sg.targetAngle - sg.angle;
    let desiredSpeed = diff * 0.08;
    
    if (desiredSpeed > sg.maxSpeed) desiredSpeed = sg.maxSpeed;
    if (desiredSpeed < -sg.maxSpeed) desiredSpeed = -sg.maxSpeed;
    
    let speedDiff = desiredSpeed - sg.speed;
    if (speedDiff > sg.accel) sg.speed += sg.accel;
    else if (speedDiff < -sg.accel) sg.speed -= sg.accel;
    else sg.speed = desiredSpeed;

    sg.angle += sg.speed;
  });
}

function render() {
  if (!ctx) return;
  
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  
  drawGrid();
  if (running) updatePhysics();
  drawTrajectory();

  const joints = [{ x: arm.base.x, y: arm.base.y }];
  let totalAngle = 0;
  
  arm.seg.forEach(sg => {
    totalAngle += sg.angle;
    const prevJoint = joints[joints.length - 1];
    joints.push({
      x: prevJoint.x + Math.cos(totalAngle) * sg.len,
      y: prevJoint.y + Math.sin(totalAngle) * sg.len,
    });
  });

  if (running && Math.random() > 0.3) {
    emitJointParticle(joints[1].x, joints[1].y);
    emitJointParticle(joints[2].x, joints[2].y);
    emitJointParticle(joints[3].x, joints[3].y);
  }

  updateAndDrawParticles();

  const tipPoint = joints[joints.length - 1];
  if (running) {
    trajectoryPath.push({ x: tipPoint.x, y: tipPoint.y });
    if (trajectoryPath.length > 45) trajectoryPath.shift(); // Длина хвоста траектории
  }

  for (let i = 0; i < joints.length - 1; i++) {
    const p1 = joints[i];
    const p2 = joints[i + 1];
    const width = 18 - i * 3.8; // Звенья плавно утончаются к концу
    const color = (i >= 2) ? ACCENT2 : ACCENT; // Последние сегменты выделяем оранжевым
    drawSegment(p1.x, p1.y, p2.x, p2.y, color, width);
  }

  joints.forEach((p, i) => {
    if (i === 0) drawBase(p.x, p.y);
    else if (i < joints.length - 1) {
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = ACCENT;
      ctx.beginPath(); 
      ctx.arc(p.x, p.y, 7 - i, 0, Math.PI * 2);
      ctx.fillStyle = ACCENT; 
      ctx.fill();
      ctx.restore();
    }
  });

  const finalJoint = joints[joints.length - 1];
  const preFinalJoint = joints[joints.length - 2];
  const effectorAngle = Math.atan2(finalJoint.y - preFinalJoint.y, finalJoint.x - preFinalJoint.x);
  
  const openWidth = 3.5 + Math.abs(Math.sin(Date.now() / 500)) * 6.5;
  drawEndEffector(finalJoint.x, finalJoint.y, effectorAngle, openWidth);

  const hudAngle = document.getElementById('val-angle');
  const hudSpeed = document.getElementById('val-speed');
  const hudLoad  = document.getElementById('val-load');
  
  if (hudAngle) hudAngle.textContent = `${Math.abs((arm.seg[0].angle * 180 / Math.PI)).toFixed(0)}°`;
  if (hudSpeed) hudSpeed.textContent = running ? `${(Math.abs(arm.seg[0].speed) * 85).toFixed(1)} м/с` : '0.0 м/с';
  if (hudLoad)  hudLoad.textContent  = running ? `${(1.5 + (10 - openWidth) * 0.6).toFixed(1)} кг` : '0.0 кг';

  if (running) frameId = requestAnimationFrame(render);
}

function startRobot() {
  if (!ctx) return;
  if (running && frameId) return;
  running = true;
  render();
  addLog('> ДВИГАТЕЛИ: ЗАПУСК СИСТЕМЫ ПИТАНИЯ...', false);
  const statusEl = document.getElementById('val-status');
  if (statusEl) {
    statusEl.textContent = 'ACTIVE';
    statusEl.className = 'viz__stat-value viz__stat-value--ok';
  }
}

function stopRobot() {
  running = false;
  if (frameId) cancelAnimationFrame(frameId);
  frameId = null;
  addLog('> ЭКСТРЕННЫЙ ОСТАНОВ СИМУЛЯЦИИ', false);
  const statusEl = document.getElementById('val-status');
  if (statusEl) {
    statusEl.textContent = 'IDLE';
    statusEl.className = 'viz__stat-value';
  }
  render(); 
}

document.getElementById('btn-play')?.addEventListener('click', startRobot);
document.getElementById('btn-stop')?.addEventListener('click', stopRobot);

const vizSection = document.getElementById('viz');
if (vizSection) {
  const vizObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !running) startRobot();
  }, { threshold: 0.3 });
  vizObserver.observe(vizSection);
}

if (ctx) {
  startRobot();
  setInterval(() => {
    if (!running) return;
    logTimer = (logTimer + 1) % logMessages.length;
    addLog(logMessages[logTimer], Math.random() > 0.25);
  }, 2200);
}

document.querySelectorAll('.stack__category').forEach(cat => {
  cat.addEventListener('click', () => {
    const filterValue = cat.getAttribute('data-filter');
    const targetCard = document.querySelector(`.card[data-tech="${filterValue}"]`);
    
    if (targetCard) {
      const offset = document.getElementById('nav')?.offsetHeight || 0;
      window.scrollTo({ top: document.getElementById('features').offsetTop - offset, behavior: 'smooth' });
      
      document.querySelectorAll('.card').forEach(c => c.style.boxShadow = 'none');
      targetCard.style.boxShadow = '0 0 25px var(--c-accent)';
      targetCard.focus();
      setTimeout(() => { targetCard.style.boxShadow = 'none'; }, 1500);
    }
  });
  
  cat.addEventListener('mouseenter', () => { cat.style.transform = 'translateY(-5px)'; cat.style.borderColor = 'var(--c-accent)'; });
  cat.addEventListener('mouseleave', () => { cat.style.transform = 'translateY(0)'; cat.style.borderColor = 'rgba(0,212,255,.1)'; });
});




const tgLinks = [
  'https://t.me/robotrends',     
  'https://t.me/proROBOTS',       
  'https://t.me/neuro_channel',   
  'https://t.me/RoboticsChannel', 
  'https://t.me/darpa_news'       
];

// Ищем абсолютно все элементы с классом js-random-tg
document.querySelectorAll('.js-random-tg').forEach(button => {
  button.addEventListener('click', (e) => {
    // На всякий случай выбираем канал заново при каждом клике
    const randomIndex = Math.floor(Math.random() * tgLinks.length);
    button.href = tgLinks[randomIndex];
  });
});