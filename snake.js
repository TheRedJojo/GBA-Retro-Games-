/* ---------- Utility punteggi ---------- */
function getNick(){ return localStorage.getItem('gba_snake_nick') || null; }

// Funzione per gestire record separati in modalità difficile
function getPersonalHS(){
  if(hardMode) return parseInt(localStorage.getItem('gba_snake_hs_hard')||'0',10);
  else return parseInt(localStorage.getItem('gba_snake_hs')||'0',10);
}
function setPersonalHS(v){
  if(hardMode) localStorage.setItem('gba_snake_hs_hard', String(v));
  else localStorage.setItem('gba_snake_hs', String(v));
}

function readScores(){ try{ return JSON.parse(localStorage.getItem('gba_snake_scores')||'[]') }catch(e){ return []; } }
function writeScores(arr){ localStorage.setItem('gba_snake_scores', JSON.stringify(arr)); }
function updateGlobalScores(nick, score){
  if(!nick) return;
  const arr = readScores();
  const idx = arr.findIndex(x=>x.nick===nick);
  if(idx>=0){ if(score > arr[idx].score) arr[idx].score = score; }
  else { arr.push({nick: nick, score: score}); }
  arr.sort((a,b)=>b.score - a.score || a.nick.localeCompare(b.nick));
  writeScores(arr);
}

/* ---------- Gioco ---------- */
const canvas=document.getElementById('game'), ctx=canvas.getContext('2d');
let GRID=15, snake=[], dir={x:0,y:0}, food={x:0,y:0}, bonusFood=null, obstacles=[], score=0;
let hardMode=false;
let hs=getPersonalHS();
let running=false, over=false, tick=130, timer=null;

/* ---------- CHANGES & CONSTANTS ---------- */
/* 1) esplosione limite esatto = 360 */
const MAX_HUMAN_SCORE = 360; // <-- il limite richiesto (360 precisi)

/* 2) skin system */
const SKINS = [
  {name:'Verde Neon', head:'#8EE5A6', headAccent:'#2C8A4B', bodyHue:130},
  {name:'Rosa Caldo', head:'#FF6FCF', headAccent:'#C20080', bodyHue:320},
  {name:'Blu Elettrico', head:'#6FD7FF', headAccent:'#0066CC', bodyHue:200},
  {name:'Neon Yellow', head:'#FFF76B', headAccent:'#B38F00', bodyHue:56},
  {name:'Vivid Orange', head:'#FF9A4B', headAccent:'#CC5A00', bodyHue:28}
];
let currentSkinIndex = parseInt(localStorage.getItem('gba_snake_skin')||'0',10) || 0;

/* 3) obstacle fade duration */
const OBSTACLE_FADE_MS = 1500; // 1.5s

/* ---------- DOM refs ---------- */
const scoreEl=document.getElementById('score'), hsEl=document.getElementById('hs'), msg=document.getElementById('message');
const playerNameEl=document.getElementById('playerName'); const nick=getNick();
playerNameEl.textContent=nick ? ('Giocatore: '+nick) : 'Giocatore anonimo';
hsEl.textContent=hs;

/* ---------- helper pos functions (improved safety) ---------- */
function randPos(){ return {x:Math.floor(Math.random()*(canvas.width/GRID)),y:Math.floor(Math.random()*(canvas.height/GRID))}; }

/* safePos now always avoids obstacles (even if in fade) and entire snake */
function safePos(pos){
  if(!pos) return false;
  for(let o of obstacles) if(o.x===pos.x && o.y===pos.y) return false;
  for(let s of snake) if(s.x===pos.x && s.y===pos.y) return false;
  return true;
}

/* obstacles are now objects {x,y,spawnAt,alpha,active} */
function randomObstacles(){
  obstacles=[];
  if(hardMode){
    const count = 8 + Math.floor(Math.random()*4);
    const now = performance.now();
    for(let i=0;i<count;i++){
      let p;
      let tries=0;
      do{ p=randPos(); tries++; if(tries>300) break; } while(!safePos(p));
      obstacles.push({x:p.x,y:p.y,spawnAt:now,alpha:0,active:false});
    }
    // start fade-in loop to increment alpha
    requestAnimationFrame(updateObstaclesFade);
  }
}

/* placeFood ensures not inside obstacles or snake - also sets bonus spawn and displays message when bonus spawns */
function placeFood() {
  let f; 
  let tries = 0;
  do { 
    f = randPos(); 
    tries++; 
    if (tries > 1000) break; 
  } while (!safePos(f));
  
  food = f;

  // Annulla eventuali bonus precedenti
  if (bonusFood) {
    bonusFood = null;
    clearTimeout(placeFood._bonusMsgTO);
    msg.textContent = '';
  }

  // 20% di probabilità di far comparire la mela dorata
  if (Math.random() < 0.2) {
    let bf; 
    let tries2 = 0;
    do { 
      bf = randPos(); 
      tries2++; 
      if (tries2 > 1000) break; 
    } while (!safePos(bf) || (bf.x === food.x && bf.y === food.y));
    
    bonusFood = bf;

    // Mostra messaggio temporaneo
    msg.textContent = "✨ È apparsa una mela dorata! Raccoglila per punti extra.";
    
    clearTimeout(placeFood._bonusMsgTO);
    placeFood._bonusMsgTO = setTimeout(() => {
      // Cancella messaggio se la mela dorata non è più presente
      if (!bonusFood) return;
      msg.textContent = '';
    }, 3000);
  } else {
    bonusFood = null;
    msg.textContent = ''; // ✅ cancella eventuali messaggi residui
    clearTimeout(placeFood._bonusMsgTO);
  }
}


/* ---------- drawing functions updated for skins & nicer obstacles ---------- */
function drawSnakePart(s,i){
  const skin = SKINS[currentSkinIndex] || SKINS[0];
  if(i===0){
    // head
    ctx.fillStyle = skin.head;
    ctx.fillRect(s.x*GRID,s.y*GRID,GRID,GRID);
    ctx.strokeStyle = skin.headAccent;
    ctx.strokeRect(s.x*GRID+1,s.y*GRID+1,GRID-2,GRID-2);
    // simple eyes
    ctx.fillStyle = "#003322";
    ctx.fillRect((s.x+0.2)*GRID,(s.y+0.2)*GRID,3,3);
    ctx.fillRect((s.x+0.6)*GRID,(s.y+0.2)*GRID,3,3);
  } else {
    // body uses HSL gradient along body length
    const lightness = Math.max(30, 70 - i*2);
    ctx.fillStyle = `hsl(${skin.bodyHue}, 60%, ${lightness}%)`;
    ctx.fillRect(s.x*GRID,s.y*GRID,GRID,GRID);
    ctx.strokeStyle = skin.headAccent;
    ctx.strokeRect(s.x*GRID+1,s.y*GRID+1,GRID-2,GRID-2);
  }
}

function drawFood(f,bonus=false){
  const g=ctx.createRadialGradient((f.x+0.5)*GRID,(f.y+0.5)*GRID,2,(f.x+0.5)*GRID,(f.y+0.5)*GRID,GRID/2);
  g.addColorStop(0,bonus?'#a89733ff':'#ff4040');
  g.addColorStop(1,bonus?'#FFA500':'#6a0000');
  ctx.fillStyle=g;
  ctx.beginPath();
  ctx.arc((f.x+0.5)*GRID,(f.y+0.5)*GRID,GRID/2.5,0,Math.PI*2);
  ctx.fill();
  ctx.fillStyle='#228b22';
  ctx.fillRect((f.x+0.4)*GRID,(f.y-0.1)*GRID,GRID/5,GRID/4);
}

/* obstacles drawing now uses alpha and nicer border */
function drawObstacles(){
  for(let o of obstacles){
    const a = ('alpha' in o) ? o.alpha : 1;
    // visible base (glossy block)
    const px = o.x*GRID, py = o.y*GRID;
    // background square with alpha
    ctx.globalAlpha = Math.min(1, Math.max(0, a));
    // gradient fill for improved visibility
    const g = ctx.createLinearGradient(px,py,px+GRID,py+GRID);
    g.addColorStop(0, `rgba(255,80,80,${0.9*a})`);
    g.addColorStop(1, `rgba(150,40,180,${0.9*a})`);
    ctx.fillStyle = g;
    ctx.fillRect(px,py,GRID,GRID);
    // border
    ctx.strokeStyle = `rgba(0,0,0,${0.9*a})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(px+1,py+1,GRID-2,GRID-2);
    // glow when fully active
    if(o.active){
      ctx.shadowColor = 'rgba(255,200,80,0.7)';
      ctx.shadowBlur = 8;
      ctx.fillRect(px+3,py+3,GRID-6,GRID-6);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }
}

function render(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#081018';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  if(bonusFood) drawFood(bonusFood,true);
  if(food) drawFood(food);
  drawObstacles();
  snake.forEach((s,i)=>drawSnakePart(s,i));
  scoreEl.textContent=score;
  hsEl.textContent=hs;
}

/* ---------- improved explosion effect ---------- */
let explosionRunning=false;
function explodeGame(){
  if(explosionRunning) return;
  explosionRunning = true;
  clearInterval(timer);
  running=false;
  over=true;
  msg.textContent = '💥 LIMITE RAGGIUNTO — SNAKE ESPOLOSO! 💥';
  const particles = [];
  const centerX = canvas.width/2, centerY = canvas.height/2;
  const colors = ['#FF3B3B','#FF9B3B','#FFD73B','#5CFF5C','#5CC8FF','#C95CFF'];
  // spawn many particles
  for(let i=0;i<250;i++){
    const angle = Math.random()*Math.PI*2;
    const speed = 0.6 + Math.random()*6;
    particles.push({
      x:centerX + (Math.random()-0.5)*40,
      y:centerY + (Math.random()-0.5)*40,
      vx:Math.cos(angle)*speed,
      vy:Math.sin(angle)*speed,
      life: 60 + Math.floor(Math.random()*60),
      col: colors[Math.floor(Math.random()*colors.length)],
      size: 1 + Math.random()*4
    });
  }
  // animated ripples
  const ripples = [];
  for(let r=0;r<6;r++){ ripples.push({r: 10 + r*12, a:0.8 - r*0.1}); }

  let frame = 0;
  function explLoop(){
    frame++;
    // fade full canvas with slight rainbow smear
    ctx.fillStyle = `rgba(0,0,0,0.12)`;
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // draw ripples
    ripples.forEach((rp,i)=>{
      ctx.beginPath();
      ctx.lineWidth = 2 + i;
      ctx.strokeStyle = `rgba(255,255,255,${Math.max(0,rp.a - frame*0.006)})`;
      ctx.arc(centerX, centerY, rp.r + frame*1.6, 0, Math.PI*2);
      ctx.stroke();
    });

    // particles
    for(let i=particles.length-1;i>=0;i--){
      const p = particles[i];
      // move
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06; // gravity for drama
      p.life--;
      // draw
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life/120));
      ctx.fillStyle = p.col;
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
      if(p.life<=0) particles.splice(i,1);
    }

    // headline animation (centered)
    ctx.font="14px 'Press Start 2P'";
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(255,255,255,${Math.max(0,1 - frame*0.008)})`;
    ctx.fillText("HAI RAGGIUNTO IL MASSIMO!", centerX, centerY - 6);
    ctx.fillStyle = `rgba(255,200,80,${Math.max(0,1 - frame*0.008)})`;
    ctx.fillText("BEN FATTO!", centerX, centerY + 20);

    if(particles.length>0 || frame < 220){
      requestAnimationFrame(explLoop);
    } else {
      // pulizia, piccola pausa e reset completo
      setTimeout(()=>{
        explosionRunning=false;
        over=false;
        // reset completo e piccolo flash per chiarezza
        reset(true);
      }, 300);
    }
  }
  explLoop();
}

/* ---------- game loop ---------- */
function loop(){
  if(!running||over) return;
  const head={x:snake[0].x+dir.x,y:snake[0].y+dir.y};
  if(head.x<0||head.y<0||head.x>=canvas.width/GRID||head.y>=canvas.height/GRID) return endGame();

  // self collision (unchanged)
  for(let i=1;i<snake.length;i++) if(snake[i].x===head.x&&snake[i].y===head.y) return endGame();

  // obstacle collision: only if obstacle.active (we handle fade)
  for(let o of obstacles){
    if(o.active && o.x===head.x && o.y===head.y){
      return endGame();
    }
  }

  snake.unshift(head);

  if(head.x===food.x && head.y===food.y){
    score++;
    // campo allungato come prima
    if(score>=60 && canvas.height<270+9*GRID){canvas.height+=9*GRID;canvas.width+=9*GRID; msg.textContent="Campo allungato!";}
    // esplosione trigger: ora scatta quando score >= MAX_HUMAN_SCORE (360)
    if(score>=MAX_HUMAN_SCORE){
      explodeGame();
      return;
    }
    if(score>hs){ hs=score; setPersonalHS(hs); msg.textContent='Nuovo record: '+hs;}
    placeFood();
    if(hardMode) randomObstacles();
  } else if(bonusFood && head.x===bonusFood.x && head.y===bonusFood.y){
    score+=2; bonusFood=null; msg.textContent='🍏 Hai mangiato la mela dorata! +2 punti';
    clearTimeout(placeFood._bonusMsgTO);
  } else snake.pop();

  render();
}

/* Controlli */
document.addEventListener('keydown',e=>{
  if(e.key==='ArrowUp'&&dir.y!==1) dir={x:0,y:-1};
  if(e.key==='ArrowDown'&&dir.y!==-1) dir={x:0,y:1};
  if(e.key==='ArrowLeft'&&dir.x!==1) dir={x:-1,y:0};
  if(e.key==='ArrowRight'&&dir.x!==-1) dir={x:1,y:0};
  if(!running&&!over) startLoop();
  // prevent scrolling page when arrow keys used
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
}, {passive:false});

let sx=0,sy=0;
document.addEventListener('touchstart',e=>{const t=e.touches[0]; sx=t.clientX; sy=t.clientY;},{passive:true});
document.addEventListener('touchend',e=>{const t=e.changedTouches[0]; const dx=t.clientX-sx, dy=t.clientY-sy;
  if(Math.abs(dx)>Math.abs(dy)){ if(dx>0&&dir.x!==-1) dir={x:1,y:0}; if(dx<0&&dir.x!==1) dir={x:-1,y:0};}
  else{ if(dy>0&&dir.y!==-1) dir={x:0,y:1}; if(dy<0&&dir.y!==1) dir={x:0,y:-1};}
  if(!running&&!over) startLoop();
},{passive:true});
document.querySelectorAll('.arrow').forEach(a=>{a.addEventListener('click',()=>{const d=a.dataset.dir;
  if(d==='up'&&dir.y!==1)dir={x:0,y:-1};
  if(d==='down'&&dir.y!==-1)dir={x:0,y:1};
  if(d==='left'&&dir.x!==1)dir={x:-1,y:0};
  if(d==='right'&&dir.x!==-1)dir={x:1,y:0};
  if(!running&&!over)startLoop();
});});

document.getElementById('btnRestart').addEventListener('click',()=>reset(true));

/* ---------- Difficulty toggle with new obstacle behavior ---------- */
document.getElementById('btnDiff').addEventListener('click',()=>{
  hardMode = !hardMode;
  msg.textContent = hardMode ? "Modalità Difficile: ON" : "Modalità Difficile: OFF";
  reset(true);
});

/* ---------- obstacle fade updater ---------- */
function updateObstaclesFade(){
  const now = performance.now();
  let needRAF = false;
  for(let o of obstacles){
    const elapsed = now - o.spawnAt;
    if(elapsed < OBSTACLE_FADE_MS){
      o.alpha = Math.max(0, elapsed/OBSTACLE_FADE_MS);
      o.active = false;
      needRAF = true;
    } else {
      o.alpha = 1;
      if(!o.active) o.active = true;
    }
  }
  // re-render so fade visible
  render();
  if(needRAF) requestAnimationFrame(updateObstaclesFade);
}

/* ---------- reset & start ---------- */
function reset(start=false){
  // reset canvas to original base size (if was extended)
  canvas.width = 270; canvas.height = 270;
  // ensure GRID is consistent based on canvas (if you want different, adjust GRID)
  snake=[{x:9,y:9}]; dir={x:0,y:0}; score=0; over=false; running=false; msg.textContent='';
  obstacles=[];
  randomObstacles();
  placeFood();
  hs=getPersonalHS(); hsEl.textContent=hs;
  render();
  if(start) startLoop();
}

function startLoop(){ if(timer) clearInterval(timer); timer=setInterval(loop,tick); running=true; }

/* ---------- endGame ---------- */
function endGame(){ over=true; running=false; clearInterval(timer); msg.textContent='Hai perso — punteggio: '+score;
  const curNick=getNick();
  if(score>hs){ hs=score; setPersonalHS(score); msg.textContent='Nuovo record: '+hs; }
  if(curNick){ updateGlobalScores(curNick,hs); }
  // Update Hall of Fame list if needed
  populateHallOfFame();
  setTimeout(()=>reset(true),1400);
}

/* ---------- UI: Hall of Fame and Pre-page (skin) injection ---------- */
(function injectUI(){
  // Nickbox (topRight)
  const nickBox = document.getElementById('nickBox');
  function renderNickBox(){
    nickBox.innerHTML = '';
    const nickStored = localStorage.getItem('gba_snake_nick');
    if(nickStored){
      const span = document.createElement('div');
      span.style.color = 'var(--text)';
      span.style.fontSize = '10px';
      span.textContent = 'Player: ' + nickStored;
      nickBox.appendChild(span);
      const clearBtn = document.createElement('div');
      clearBtn.style.marginLeft='8px';
      clearBtn.style.cursor='pointer';
      clearBtn.style.fontSize='9px';
      clearBtn.style.color='var(--muted)';
      clearBtn.textContent='(cambia)';
      clearBtn.onclick = ()=>{ localStorage.removeItem('gba_snake_nick'); renderNickBox(); location.reload(); };
      nickBox.appendChild(clearBtn);
    } else {
      const input = document.createElement('input');
      input.placeholder = 'NICK';
      input.maxLength = 12;
      input.style.fontSize='10px';
      input.className='nickInput';
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
        location.reload();
      };
      nickBox.appendChild(btn);
    }
  }
  renderNickBox();

  // Hall of Fame select
  const hofContainer = document.getElementById('hofContainer');
  const label = document.createElement('div');
  label.style.fontSize='9px';
  label.style.color='var(--muted)';
  label.style.marginTop='6px';
  label.style.textAlign='center';
  label.textContent = 'Hall of Fame';
  hofContainer.appendChild(label);
  const select = document.createElement('select');
  select.className = 'hof-select';
  select.id = 'hofSelect';
  hofContainer.appendChild(select);

  // Pre pagina button
  const controls = document.getElementById('controls');
  const preBtn = document.createElement('div');
  preBtn.className = 'btn';
  preBtn.id = 'btnPre';
  preBtn.textContent = 'SKINS';
  preBtn.style.flex = '1 1 95%';
  controls.appendChild(preBtn);

  // skin modal elements
  const skinModal = document.getElementById('skinModal');
  const skinGrid = document.getElementById('skinGrid');
  const skinSave = document.getElementById('skinSave');

  // populate skin options
  SKINS.forEach((s,idx)=>{
    const it = document.createElement('div');
    it.className = 'skin-item';
    it.title = s.name;
    it.dataset.idx = idx;
    it.style.background = s.head;
    it.addEventListener('click', ()=>{
      document.querySelectorAll('.skin-item').forEach(x=>x.classList.remove('selected'));
      it.classList.add('selected');
      currentSkinIndex = idx;
    });
    skinGrid.appendChild(it);
  });

  // mark selected skin
  setTimeout(()=>{ const selItem = skinGrid.querySelector(`[data-idx="${currentSkinIndex}"]`); if(selItem) selItem.classList.add('selected'); },100);

  preBtn.addEventListener('click', ()=>{
    skinModal.style.display='flex';
    skinModal.setAttribute('aria-hidden','false');
  });

  // save skin
  skinSave.addEventListener('click', ()=>{
    localStorage.setItem('gba_snake_skin', String(currentSkinIndex));
    skinModal.style.display='none';
    skinModal.setAttribute('aria-hidden','true');
    msg.textContent = 'Skin salvata';
    setTimeout(()=>{ msg.textContent=''; },1200);
  });

  // close modal by clicking outside panel
  skinModal.addEventListener('click', (e)=>{ if(e.target===skinModal){ skinModal.style.display='none'; skinModal.setAttribute('aria-hidden','true'); } });

  // populate Hall of Fame list (initial)
  populateHallOfFame();

  // ensure "Gambero" present as requested
  const cur = readScores();
  if(!cur.some(x=>x.nick==='Gambero')){
    cur.push({nick:'Gambero', score: 126});
    writeScores(cur);
  }
  populateHallOfFame();
})();

function populateHallOfFame(){
  const select = document.getElementById('hofSelect');
  if(!select) return;
  // clear
  select.innerHTML = '';
  // include those (local scores) > 100
  const arr = readScores().filter(x=>x.score>100).sort((a,b)=>b.score-a.score);
  if(arr.length===0){
    // if none, at least include "Gambero"
    const opt = document.createElement('option');
    opt.value = 'Gambero';
    opt.textContent = 'Gambero — 126';
    select.appendChild(opt);
  } else {
    for(const r of arr){
      const opt = document.createElement('option');
      opt.value = r.nick;
      opt.textContent = `${r.nick} — ${r.score}`;
      select.appendChild(opt);
    }
    // ensure Gambero still present if user wants to see it
    if(!arr.some(x=>x.nick==='Gambero')){
      const opt = document.createElement('option');
      opt.value = 'Gambero';
      opt.textContent = 'Gambero — 126';
      select.appendChild(opt);
    }
  }
}

/* ---------- init ---------- */
reset(true);
render();

/* Optional: handle window resize to keep grid consistent (simple) */
window.addEventListener('resize', ()=>{
  // keep canvas display width responsive (CSS handled), but actual pixel dimensions remain 270x270 for logic simplicity
  // if you want to scale game resolution, you'd handle here.
});