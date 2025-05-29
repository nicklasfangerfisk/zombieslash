// ZombieSlasher - Simpelt browser-spil

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const hud = document.getElementById('hud');

// Tilpas canvas til vinduet
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Spillets tilstand
const state = {
  hero: { x: 400, y: 300, size: 32, hp: 100, speed: 4, xp: 0, level: 1 },
  zombies: [],
  boss: null,
  keys: {},
  bullets: [],
  gameOver: false,
  bossDefeated: false,
  spawnTimer: 0,
  bossSpawned: false
};

// Input
window.addEventListener('keydown', e => state.keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => state.keys[e.key.toLowerCase()] = false);
window.addEventListener('mousedown', shoot);

function shoot(e) {
  if (state.gameOver || state.bossDefeated) return;
  const angle = Math.atan2(e.clientY - state.hero.y, e.clientX - state.hero.x);
  state.bullets.push({
    x: state.hero.x,
    y: state.hero.y,
    dx: Math.cos(angle) * 10,
    dy: Math.sin(angle) * 10,
    size: 8
  });
}

function spawnZombie() {
  // Spawn i kanten
  let edge = Math.floor(Math.random() * 4);
  let x, y;
  if (edge === 0) { x = 0; y = Math.random() * canvas.height; }
  else if (edge === 1) { x = canvas.width; y = Math.random() * canvas.height; }
  else if (edge === 2) { x = Math.random() * canvas.width; y = 0; }
  else { x = Math.random() * canvas.width; y = canvas.height; }
  state.zombies.push({ x, y, size: 28, hp: 20, speed: 1.5 + Math.random(), xp: 10 });
}

function spawnBoss() {
  state.boss = { x: canvas.width/2, y: 80, size: 80, hp: 300, speed: 2, xp: 200 };
  state.bossSpawned = true;
}

function update() {
  if (state.gameOver || state.bossDefeated) return;
  // Hero bevægelse
  if (state.keys['w'] || state.keys['arrowup']) state.hero.y -= state.hero.speed;
  if (state.keys['s'] || state.keys['arrowdown']) state.hero.y += state.hero.speed;
  if (state.keys['a'] || state.keys['arrowleft']) state.hero.x -= state.hero.speed;
  if (state.keys['d'] || state.keys['arrowright']) state.hero.x += state.hero.speed;
  // Begræns til skærmen
  state.hero.x = Math.max(state.hero.size/2, Math.min(canvas.width-state.hero.size/2, state.hero.x));
  state.hero.y = Math.max(state.hero.size/2, Math.min(canvas.height-state.hero.size/2, state.hero.y));

  // Spawn zombier
  if (!state.bossSpawned) {
    state.spawnTimer--;
    if (state.spawnTimer <= 0) {
      spawnZombie();
      state.spawnTimer = 40 + Math.random()*40;
    }
    // Spawn boss når XP er høj nok
    if (state.hero.xp >= 200) spawnBoss();
  }

  // Opdater zombier
  for (let z of state.zombies) {
    let dx = state.hero.x - z.x;
    let dy = state.hero.y - z.y;
    let dist = Math.hypot(dx, dy);
    if (dist > 0) {
      z.x += (dx/dist) * z.speed;
      z.y += (dy/dist) * z.speed;
    }
    // Collision med hero
    if (dist < (z.size+state.hero.size)/2) {
      state.hero.hp -= 0.5;
      if (state.hero.hp <= 0) state.gameOver = true;
    }
  }

  // Opdater boss
  if (state.boss) {
    let dx = state.hero.x - state.boss.x;
    let dy = state.hero.y - state.boss.y;
    let dist = Math.hypot(dx, dy);
    if (dist > 0) {
      state.boss.x += (dx/dist) * state.boss.speed;
      state.boss.y += (dy/dist) * state.boss.speed;
    }
    if (dist < (state.boss.size+state.hero.size)/2) {
      state.hero.hp -= 1.5;
      if (state.hero.hp <= 0) state.gameOver = true;
    }
  }

  // Opdater bullets
  for (let b of state.bullets) {
    b.x += b.dx;
    b.y += b.dy;
  }
  // Fjern bullets udenfor skærm
  state.bullets = state.bullets.filter(b => b.x > 0 && b.x < canvas.width && b.y > 0 && b.y < canvas.height);

  // Bullet collision med zombier
  for (let b of state.bullets) {
    for (let z of state.zombies) {
      let dist = Math.hypot(b.x-z.x, b.y-z.y);
      if (dist < (b.size+z.size)/2) {
        z.hp -= 20;
        b.x = -1000; // Fjern bullet
        if (z.hp <= 0) {
          state.hero.xp += z.xp;
          state.zombies.splice(state.zombies.indexOf(z),1);
        }
      }
    }
  }
  // Bullet collision med boss
  if (state.boss) {
    for (let b of state.bullets) {
      let dist = Math.hypot(b.x-state.boss.x, b.y-state.boss.y);
      if (dist < (b.size+state.boss.size)/2) {
        state.boss.hp -= 20;
        b.x = -1000;
        if (state.boss.hp <= 0) {
          state.hero.xp += state.boss.xp;
          state.bossDefeated = true;
        }
      }
    }
  }
}

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // Hero
  ctx.save();
  ctx.translate(state.hero.x, state.hero.y);
  ctx.fillStyle = '#4af';
  ctx.beginPath();
  ctx.arc(0,0,state.hero.size/2,0,Math.PI*2);
  ctx.fill();
  ctx.restore();
  // Zombier
  for (let z of state.zombies) {
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.fillStyle = '#3c3';
    ctx.beginPath();
    ctx.arc(0,0,z.size/2,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
  // Boss
  if (state.boss && !state.bossDefeated) {
    ctx.save();
    ctx.translate(state.boss.x, state.boss.y);
    ctx.fillStyle = '#c33';
    ctx.beginPath();
    ctx.arc(0,0,state.boss.size/2,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
  // Bullets
  ctx.fillStyle = '#fff';
  for (let b of state.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.size/2, 0, Math.PI*2);
    ctx.fill();
  }
}

let firstStart = true;
let gameStarted = false;

function showDialog(message, showStart = false) {
  const dialog = document.getElementById('gameDialog');
  const msg = document.getElementById('dialogMessage');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  if (dialog && msg && startBtn && restartBtn) {
    msg.innerHTML = message;
    dialog.style.display = 'flex';
    if (showStart) {
      startBtn.style.display = '';
      restartBtn.style.display = 'none';
    } else {
      startBtn.style.display = 'none';
      restartBtn.style.display = '';
    }
  }
}

function hideDialog() {
  const dialog = document.getElementById('gameDialog');
  if (dialog) dialog.style.display = 'none';
}

function startGame() {
  // Nulstil state VED start (ikke kun ved restart)
  state.hero = { x: 400, y: 300, size: 32, hp: 100, speed: 4, xp: 0, level: 1 };
  state.zombies = [];
  state.boss = null;
  state.bullets = [];
  state.gameOver = false;
  state.bossDefeated = false;
  state.spawnTimer = 0;
  state.bossSpawned = false;
  gameStarted = true;
  hideDialog();
}

function restartGame() {
  // Nulstil state
  state.hero = { x: 400, y: 300, size: 32, hp: 100, speed: 4, xp: 0, level: 1 };
  state.zombies = [];
  state.boss = null;
  state.bullets = [];
  state.gameOver = false;
  state.bossDefeated = false;
  state.spawnTimer = 0;
  state.bossSpawned = false;
  gameStarted = true;
  hideDialog();
}

// Gør startGame og restartGame globale så de kan kaldes fra index.html
window.startGame = startGame;
window.restartGame = restartGame;

function drawHUD() {
  // Kun point og status i #hud
  const hudElem = document.getElementById('hud');
  hudElem.innerHTML = `HP: ${Math.max(0,Math.round(state.hero.hp))} | XP: ${state.hero.xp}`;
}

function gameLoop() {
  if (gameStarted) {
    update();
    draw();
    drawHUD();
    if (state.bossDefeated) {
      gameStarted = false;
      showDialog('DU VANDT!', false);
    } else if (state.gameOver) {
      gameStarted = false;
      showDialog('GAME OVER', false);
    }
  } else {
    // Hvis spillet ikke er startet, sørg for at canvas er ryddet
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  requestAnimationFrame(gameLoop);
}

// Sørg for at gameLoop starter
if (!window._gameLoopStarted) {
  window._gameLoopStarted = true;
  requestAnimationFrame(gameLoop);
}

// Vis dialogen med start-knap når dialogen er indlæst
window.showStartDialog = function() {
  showDialog('Velkommen til Daves Zombie Slash!<br>Brug WASD/piletaster til at bevæge dig og musen til at skyde.', true);
}

document.addEventListener('DOMContentLoaded', () => {
  // Hvis dialogen allerede er indlæst, vis startdialog
  if (window.showStartDialog) window.showStartDialog();
});
