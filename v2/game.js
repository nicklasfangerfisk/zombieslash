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

let weapon = 'pistol'; // pistol, mg, sg, bz
let ownedWeapons = ['pistol']; // Liste over købte våben

window.setupShop = function() {
  const shopXP = document.getElementById('shopXP');
  const shopMsg = document.getElementById('shopMsg');
  const mgBtn = document.getElementById('buyMG');
  const sgBtn = document.getElementById('buySG');
  const bzBtn = document.getElementById('buyBZ');
  const weaponSelect = document.getElementById('weaponSelect');
  function updateShop() {
    const total = totalXP + state.hero.xp;
    shopXP.innerHTML = `XP: <b>${total}</b><br>Våben: <b>${weaponNavn(weapon)}</b>`;
    mgBtn.disabled = ownedWeapons.includes('mg') || total < 100;
    sgBtn.disabled = ownedWeapons.includes('sg') || total < 150;
    bzBtn.disabled = ownedWeapons.includes('bz') || total < 300;
    // Opdater våbenvælger
    if (weaponSelect) {
      weaponSelect.innerHTML = '';
      ownedWeapons.forEach(w => {
        const btn = document.createElement('button');
        btn.textContent = weaponNavn(w);
        btn.disabled = weapon === w;
        btn.onclick = () => {
          weapon = w;
          updateShop();
        };
        weaponSelect.appendChild(btn);
      });
    }
  }
  function weaponNavn(w) {
    if (w==='mg') return 'Maskingevær';
    if (w==='sg') return 'Shotgun';
    if (w==='bz') return 'Bazooka';
    return 'Pistol';
  }
  if (mgBtn) mgBtn.onclick = function() {
    const total = totalXP + state.hero.xp;
    if (total >= 100 && !ownedWeapons.includes('mg')) {
      brugXP(100);
      ownedWeapons.push('mg');
      weapon = 'mg';
      shopMsg.innerText = 'Maskingevær købt!';
      updateShop();
    }
  };
  if (sgBtn) sgBtn.onclick = function() {
    const total = totalXP + state.hero.xp;
    if (total >= 150 && !ownedWeapons.includes('sg')) {
      brugXP(150);
      ownedWeapons.push('sg');
      weapon = 'sg';
      shopMsg.innerText = 'Shotgun købt!';
      updateShop();
    }
  };
  if (bzBtn) bzBtn.onclick = function() {
    const total = totalXP + state.hero.xp;
    if (total >= 300 && !ownedWeapons.includes('bz')) {
      brugXP(300);
      ownedWeapons.push('bz');
      weapon = 'bz';
      shopMsg.innerText = 'Bazooka købt!';
      updateShop();
    }
  };
  function brugXP(amount) {
    // Brug XP fra hero først, så fra totalXP
    if (state.hero.xp >= amount) {
      state.hero.xp -= amount;
    } else {
      const rest = amount - state.hero.xp;
      state.hero.xp = 0;
      totalXP -= rest;
    }
  }
  updateShop();
};

function shoot(e) {
  if (state.gameOver || state.bossDefeated) return;
  const angle = Math.atan2(e.clientY - state.hero.y, e.clientX - state.hero.x);
  if (weapon === 'mg') {
    // Maskingevær: hurtigere skud (skyder 3 kugler hurtigt)
    for (let i=0;i<3;i++) {
      setTimeout(()=>{
        state.bullets.push({
          x: state.hero.x,
          y: state.hero.y,
          dx: Math.cos(angle) * 12,
          dy: Math.sin(angle) * 12,
          size: 7
        });
      }, i*60);
    }
  } else if (weapon === 'sg') {
    // Shotgun: 5 kugler i vifte
    for (let i=-2;i<=2;i++) {
      const spread = angle + i*0.15;
      state.bullets.push({
        x: state.hero.x,
        y: state.hero.y,
        dx: Math.cos(spread) * 10,
        dy: Math.sin(spread) * 10,
        size: 10
      });
    }
  } else if (weapon === 'bz') {
    // Bazooka: én stor kugle
    state.bullets.push({
      x: state.hero.x,
      y: state.hero.y,
      dx: Math.cos(angle) * 8,
      dy: Math.sin(angle) * 8,
      size: 22,
      bazooka: true
    });
  } else {
    // Pistol
    state.bullets.push({
      x: state.hero.x,
      y: state.hero.y,
      dx: Math.cos(angle) * 10,
      dy: Math.sin(angle) * 10,
      size: 8
    });
  }
}

let currentLevel = 1;
const maxLevel = 5;
let totalXP = 0;

function nextLevel() {
  if (currentLevel < maxLevel) {
    totalXP += state.hero.xp;
    currentLevel++;
    state.hero = { x: 400, y: 300, size: 32, hp: 100, speed: 4, xp: 0, level: currentLevel };
    state.zombies = [];
    state.boss = null;
    state.bullets = [];
    state.gameOver = false;
    state.bossDefeated = false;
    state.spawnTimer = 0;
    state.bossSpawned = false;
    gameStarted = true;
    hideDialog();
    // Opdater shop efter XP er lagt til
    if (window.setupShop) window.setupShop();
  }
}

function spawnZombie() {
  // Spawn i kanten
  let edge = Math.floor(Math.random() * 4);
  let x, y;
  if (edge === 0) { x = 0; y = Math.random() * canvas.height; }
  else if (edge === 1) { x = canvas.width; y = Math.random() * canvas.height; }
  else if (edge === 2) { x = Math.random() * canvas.width; y = 0; }
  else { x = Math.random() * canvas.width; y = canvas.height; }
  // Gør zombier sværere pr. level
  const baseSpeed = 1.5 + Math.random() + (currentLevel-1)*0.5;
  const baseHp = 20 + (currentLevel-1)*10;
  const baseXp = 10 + (currentLevel-1)*5;
  state.zombies.push({ x, y, size: 28, hp: baseHp, speed: baseSpeed, xp: baseXp });
}

function spawnBoss() {
  if (currentLevel < maxLevel) {
    state.boss = { x: canvas.width/2, y: 80, size: 80, hp: 300 + (currentLevel-1)*100, speed: 2 + (currentLevel-1)*0.5, xp: 200 + (currentLevel-1)*50 };
  } else {
    // Superboss på level 5
    state.boss = { x: canvas.width/2, y: 80, size: 120, hp: 1000, speed: 3, xp: 1000 };
  }
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
        if (b.bazooka) {
          // Bazooka: splash damage
          for (let z2 of state.zombies) {
            let d2 = Math.hypot(b.x-z2.x, b.y-z2.y);
            if (d2 < 60) {
              z2.hp -= 60;
            }
          }
        }
        z.hp -= b.bazooka ? 60 : (b.size >= 10 ? 35 : 20);
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

function showDialog(message, showStart = false, showNext = false) {
  const dialog = document.getElementById('gameDialog');
  const msg = document.getElementById('dialogMessage');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const nextBtn = document.getElementById('nextLevelBtn');
  if (nextBtn) {
    nextBtn.onclick = nextLevel;
  }
  let extra = '';
  if (!showStart) {
    const total = totalXP + state.hero.xp;
    extra = `<br><span style='font-size:0.7em;'>Din XP: <b>${total}</b></span>`;
  }
  if (dialog && msg && startBtn && restartBtn) {
    msg.innerHTML = message + extra;
    dialog.style.display = 'flex';
    if (showStart) {
      startBtn.style.display = '';
      restartBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
    } else if (showNext) {
      startBtn.style.display = 'none';
      restartBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = '';
    } else {
      startBtn.style.display = 'none';
      restartBtn.style.display = '';
      if (nextBtn) nextBtn.style.display = 'none';
    }
    // Opdater shop hver gang dialogen vises
    if (window.setupShop) window.setupShop();
  }
}

function hideDialog() {
  const dialog = document.getElementById('gameDialog');
  if (dialog) dialog.style.display = 'none';
}

function startGame() {
  currentLevel = 1;
  totalXP = 0;
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
  currentLevel = 1;
  totalXP = 0;
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
  const hudElem = document.getElementById('hud');
  const total = totalXP + state.hero.xp;
  hudElem.innerHTML = `Level: ${currentLevel} | HP: ${Math.max(0,Math.round(state.hero.hp))} | XP: ${total}`;
}

function gameLoop() {
  if (gameStarted) {
    update();
    draw();
    drawHUD();
    if (state.bossDefeated) {
      gameStarted = false;
      if (currentLevel < maxLevel) {
        showDialog(`Level ${currentLevel} gennemført!`, false, true);
      } else {
        showDialog('DU VANDT! (Superboss besejret)', false, false);
      }
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
