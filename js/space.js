const nickBox = document.getElementById('nickBox'); 

function renderNickBox(){
  const nick = localStorage.getItem('gba_snake_nick');
  nickBox.innerHTML = '';
  if(nick){
    const span = document.createElement('div');
    span.style.color = 'var(--text)';
    span.style.fontSize = '10px';
    span.textContent = 'Player: ' + nick;
    nickBox.appendChild(span);
  } else {
    const input = document.createElement('input');
    input.placeholder = 'NICK';
    input.maxLength = 12;
    input.id = 'nickInput';
    nickBox.appendChild(input);
    const btn = document.createElement('button');
    btn.textContent = 'OK';
    btn.onclick = ()=> {
      const v = input.value.trim();
      if(!v){ alert('Inserisci un nickname valido.'); input.focus(); return; }
      const safe = v.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,12);
      localStorage.setItem('gba_snake_nick', safe);
      if(!localStorage.getItem('gba_snake_hs')) localStorage.setItem('gba_snake_hs','0');
      renderNickBox();
    };
    nickBox.appendChild(btn);
  }
}

// Blocca pinch-to-zoom su mobile
document.addEventListener('touchmove', function(e){
  if(e.scale !== undefined && e.scale !== 1) e.preventDefault();
}, { passive: false });

document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('gesturechange', e => e.preventDefault());
document.addEventListener('gestureend', e => e.preventDefault());

// Blocca zoom con Ctrl + scroll o Ctrl + +/-
window.addEventListener('wheel', function(e){
  if(e.ctrlKey) e.preventDefault();
}, { passive: false });

window.addEventListener('keydown', function(e){
  if((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')){
    e.preventDefault();
  }
});

renderNickBox();

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('btnStart');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const highScoreEl = document.getElementById('highScore');
const gameOverEl = document.getElementById('gameOver');

let player, bullets, enemies, particles;
let keys = {};
let score = 0, lives = 3, gameRunning = false;
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// ===== Caricamento immagini =====
const nav = new Image();
nav.src = 'nav.png';
const meteor = new Image();
meteor.src = 'meteor.png';

// ===== High Score =====
function getHighScore(){ return parseInt(localStorage.getItem('gba_space_hs') || '0'); }
function setHighScore(val){ localStorage.setItem('gba_space_hs', val); }

// ===== Utility =====
function rand(min, max){ return Math.random() * (max - min) + min; }

function resetGame(){
  player = {x: WIDTH/2-32, y: HEIGHT-80, w: 64, h: 64, speed: 5, cooldown: 0, hit: false};
  bullets = [];
  enemies = [];
  particles = [];
  score = 0;
  lives = 3;
  gameRunning = true;
  shooting = false;
  gameOverEl.style.display = 'none';
  hideWinner();
  updateHUD();
}

// ===== Controls =====
document.addEventListener('keydown', e => keys[e.key] = true);
document.addEventListener('keyup', e => keys[e.key] = false);

const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
let moveLeft = false, moveRight = false;
let shooting = false;

[leftBtn, rightBtn].forEach(btn=>{
  btn.addEventListener('touchstart', e=>{
    e.preventDefault();
    if(btn === leftBtn) moveLeft = true;
    else moveRight = true;
  });
  btn.addEventListener('touchend', ()=> moveLeft = moveRight = false);
});

// ===== Touch per sparare e muovere navicella corretto =====
function getTouchPos(touch){
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (touch.clientX - rect.left) * scaleX - player.w / 2,
    y: (touch.clientY - rect.top) * scaleY - player.h / 2
  };
}

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  shooting = true;
  const pos = getTouchPos(e.touches[0]);
  player.x = pos.x;
  player.y = pos.y;
});

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const pos = getTouchPos(e.touches[0]);
  player.x = pos.x;
  player.y = pos.y;
});

canvas.addEventListener('touchend', e => { shooting = false; });

// ===== Game Logic =====
function shoot(){
  if(player.cooldown <= 0){
    bullets.push({x: player.x + player.w/2 - 2, y: player.y, w: 4, h: 10, speed: 7});
    player.cooldown = 10;
  }
}

function spawnEnemy(){
  if(Math.random() < 0.03){
    enemies.push({x: rand(0, WIDTH-48), y: -48, w: 48, h: 48, speed: rand(1.5,3)});
  }
}

function update(){
  if(!gameRunning) return;

  if(keys['ArrowLeft'] || keys['a'] || moveLeft) player.x -= player.speed;
  if(keys['ArrowRight'] || keys['d'] || moveRight) player.x += player.speed;
  player.x = Math.max(0, Math.min(WIDTH - player.w, player.x));

  if((keys[' '] || keys['ArrowUp'] || keys['w'] || shooting) && player.cooldown <= 0) shoot();
  if(player.cooldown > 0) player.cooldown--;

  bullets.forEach(b => b.y -= b.speed);
  bullets = bullets.filter(b => b.y + b.h > 0);

  enemies.forEach(e => e.y += e.speed);
  enemies = enemies.filter(e => e.y < HEIGHT + e.h);

  for(let i=enemies.length-1; i>=0; i--){
    let e = enemies[i];
    for(let j=bullets.length-1; j>=0; j--){
      let b = bullets[j];
      if(b.x < e.x + e.w && b.x + b.w > e.x && b.y < e.y + e.h && b.y + b.h > e.y){
        enemies.splice(i,1);
        bullets.splice(j,1);
        score += 100;
        createExplosion(e.x+e.w/2, e.y+e.h/2);
        break;
      }
    }
  }

  for(let e of enemies){
    if(e.x < player.x + player.w && e.x + e.w > player.x && e.y < player.y + player.h && e.y + e.h > player.y){
      e.y = HEIGHT + 50;
      lives--;

      player.hit = true;
      setTimeout(() => { player.hit = false; }, 500);

      createExplosion(player.x + player.w/2, player.y + player.h/2, 'danger');

      if(lives <= 0){
        gameRunning = false;
        gameOverEl.style.display = 'block';
        if(score > getHighScore()) setHighScore(score);
      }
    }
  }

  if(score >= 50000 && !document.getElementById('winnerOverlay')){
    showWinner();
  }

  updateParticles();
  spawnEnemy();
  updateHUD();
}

// ===== Draw =====
function draw(){
  ctx.clearRect(0,0,WIDTH,HEIGHT);

  if(player.hit){
    ctx.fillStyle = '#FF3B3B';
    ctx.fillRect(player.x, player.y, player.w, player.h);
  } else {
    ctx.drawImage(nav, player.x, player.y, player.w, player.h);
  }

  ctx.fillStyle = '#FFD27F';
  bullets.forEach(b => ctx.fillRect(b.x,b.y,b.w,b.h));

  enemies.forEach(e => ctx.drawImage(meteor, e.x, e.y, e.w, e.h));

  drawParticles();
}

function gameLoop(){
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// ===== Particles =====
function createExplosion(x,y,color){
  for(let i=0;i<20;i++){
    particles.push({
      x, y,
      vx: rand(-2,2),
      vy: rand(-2,2),
      life: rand(20,40),
      color: color==='danger'? '#FF3B3B': i%2? '#FFD27F':'#FF3B3B'
    });
  }
}

function updateParticles(){
  for(let p of particles){
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
  }
  particles = particles.filter(p=>p.life>0);
}

function drawParticles(){
  for(let p of particles){
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x,p.y,2,2);
  }
}

// ===== HUD =====
function updateHUD(){
  scoreEl.textContent = `💎 SCORE: ${score.toString().padStart(4,'0')}`;
  livesEl.textContent = '❤️'.repeat(lives);
  highScoreEl.textContent = `🏆 HIGH SCORE: ${getHighScore()}`;
}

// ===== Winner Overlay =====
function showWinner(){
  const overlay = document.createElement('div');
  overlay.id = 'winnerOverlay';
  overlay.style.textAlign = 'center'; 
  overlay.style.position = 'fixed';
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.background = 'rgba(0,0,0,0.85)';
  overlay.style.color = 'gold';
  overlay.style.fontSize = '30px';
  overlay.style.fontFamily = 'Press Start 2P';
  overlay.style.display = 'flex';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.flexDirection = 'column';
  overlay.style.zIndex = 9999;
  overlay.textContent = '🏆 SEI IL VINCITORE ASSOLUTO!\n HAI RAGGIUNTO IL PUNTEGGIO MASSIMO DI\n 50.000 pt!';

  document.body.appendChild(overlay);

  // Piccoli coriandoli
  for(let i=0;i<100;i++){
    particles.push({
      x: rand(0, WIDTH),
      y: rand(0, HEIGHT),
      vx: rand(-3,3),
      vy: rand(-3,3),
      life: rand(50,100),
      color: `hsl(${rand(0,360)},100%,60%)`
    });
  }

  setTimeout(() => hideWinner(),7000);
}

function hideWinner(){
  const overlay = document.getElementById('winnerOverlay');
  if(overlay) overlay.remove();
}

// ===== Buttons =====
startBtn.onclick = ()=>{ resetGame(); };

// ===== Start loop =====
resetGame();
gameLoop();
