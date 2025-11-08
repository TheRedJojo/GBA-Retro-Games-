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
renderNickBox();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('btnStart');
const fullBtn = document.getElementById('btnFull');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');

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

// ===== Utility =====
function rand(min, max){ return Math.random() * (max - min) + min; }

function resetGame(){
  player = {x: WIDTH/2-32, y: HEIGHT-80, w: 64, h: 64, speed: 5, cooldown: 0};
  bullets = [];
  enemies = [];
  particles = [];
  score = 0;
  lives = 3;
  gameRunning = true;
}

// ===== Controls =====
document.addEventListener('keydown', e => keys[e.key] = true);
document.addEventListener('keyup', e => keys[e.key] = false);

// Touch controls
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const shootBtn = document.getElementById('shootBtn');
let moveLeft = false, moveRight = false;

[leftBtn, rightBtn].forEach(btn=>{
  btn.addEventListener('touchstart', e=>{
    e.preventDefault();
    if(btn === leftBtn) moveLeft = true;
    else moveRight = true;
  });
  btn.addEventListener('touchend', ()=> moveLeft = moveRight = false);
});

shootBtn.addEventListener('touchstart', e=>{
  e.preventDefault();
  shoot();
});

// Touch drag movement
canvas.addEventListener('touchmove', e=>{
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  player.x = touch.clientX - rect.left - player.w/2;
  player.y = touch.clientY - rect.top - player.h/2;
});

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

  // Move player
  if(keys['ArrowLeft'] || keys['a'] || moveLeft) player.x -= player.speed;
  if(keys['ArrowRight'] || keys['d'] || moveRight) player.x += player.speed;
  player.x = Math.max(0, Math.min(WIDTH - player.w, player.x));

  if((keys[' '] || keys['ArrowUp'] || keys['w']) && player.cooldown <= 0) shoot();
  if(player.cooldown > 0) player.cooldown--;

  bullets.forEach(b => b.y -= b.speed);
  bullets = bullets.filter(b => b.y + b.h > 0);

  enemies.forEach(e => e.y += e.speed);
  enemies = enemies.filter(e => e.y < HEIGHT + e.h);

  // Collisions
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

  // Enemy hits player
  for(let e of enemies){
    if(e.x < player.x + player.w && e.x + e.w > player.x && e.y < player.y + player.h && e.y + e.h > player.y){
      createExplosion(player.x+player.w/2, player.y+player.h/2, 'danger');
      lives--;
      e.y = HEIGHT+50;
      if(lives<=0){ gameRunning = false; alert('GAME OVER!'); }
    }
  }

  updateParticles();
  spawnEnemy();

  scoreEl.textContent = `SCORE: ${score.toString().padStart(4,'0')}`;
  livesEl.textContent = '❤️'.repeat(lives);

}

function draw(){
  ctx.clearRect(0,0,WIDTH,HEIGHT);
    
  // Navicella
  ctx.drawImage(nav, player.x, player.y, player.w, player.h);

  // Proiettili
  ctx.fillStyle = '#FFD27F';
  bullets.forEach(b => ctx.fillRect(b.x,b.y,b.w,b.h));

  // Meteore
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

// ===== Buttons =====
startBtn.onclick = ()=>{ resetGame(); };
fullBtn.onclick = ()=>{
  if(!document.fullscreenElement) canvas.requestFullscreen();
  else document.exitFullscreen();
};

// Start loop
resetGame();
gameLoop();
