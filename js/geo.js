/* nickname logic */
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
/* --- Previene zoom con doppio tap su mobile --- */
let lastTouchEnd = 0;
document.addEventListener('touchend', e => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) e.preventDefault();
  lastTouchEnd = now;
}, false);

/* --- SCRIPT ORIGINALE INALTERATO --- */
const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');
const COLS = 12, ROWS = 20;
const BLOCK = canvas.width / COLS;
let arena = createMatrix(COLS, ROWS);
let player = { pos:{x:0,y:0}, matrix:null, score:0};
let dropCounter = 0, dropInterval = 1000, lastTime = 0, difficulty = 1;

const colors = ['#000','#FFD27F','#74C2FF','#FFD3FF','#FF7B7B','#9BFF8A','#74B3FF','#DDDDDD'];

function createMatrix(w,h){ const m=[]; while(h--) m.push(new Array(w).fill(0)); return m; }
function createPiece(type){
  if(type==='T') return [[0,1,0],[1,1,1],[0,0,0]];
  if(type==='O') return [[2,2],[2,2]];
  if(type==='L') return [[0,0,3],[3,3,3],[0,0,0]];
  if(type==='J') return [[4,0,0],[4,4,4],[0,0,0]];
  if(type==='I') return [[0,5,0,0],[0,5,0,0],[0,5,0,0],[0,5,0,0]];
  if(type==='S') return [[0,6,6],[6,6,0],[0,0,0]];
  if(type==='Z') return [[7,7,0],[0,7,7],[0,0,0]];
}
function randomPiece(){
  const easyPieces = 'OILT'; 
  const allPieces = 'TJLOSZI';
  if(difficulty===1) return easyPieces[Math.floor(Math.random()*easyPieces.length)];
  if(difficulty>=2) return allPieces[Math.floor(Math.random()*allPieces.length)];
}
function collide(arena,player){
  const [m,o] = [player.matrix, player.pos];
  for(let y=0;y<m.length;y++) for(let x=0;x<m[y].length;x++)
    if(m[y][x]!==0 && (arena[y+o.y] && arena[y+o.y][x+o.x])!==0) return true;
  return false;
}
function merge(arena,player){
  player.matrix.forEach((row,y)=>row.forEach((v,x)=>{ if(v) arena[y+player.pos.y][x+player.pos.x]=v; }));
}
function arenaSweep(){
  let rowCount=1;
  outer: for(let y=arena.length-1;y>=0;y--){
    if(arena[y].every(v=>v!==0)){
      arena.splice(y,1);
      arena.unshift(new Array(COLS).fill(0));
      player.score += rowCount * 10;
      rowCount *=2;
      y++;
      document.getElementById('gscore').textContent = player.score;
    }
  }
}
function playerReset(){
  player.matrix = createPiece(randomPiece());
  player.pos = {x: Math.floor(COLS/2) - Math.floor(player.matrix[0].length/2), y:0};
  if(collide(arena,player)){
    arena = createMatrix(COLS,ROWS);
    player.score=0;
    document.getElementById('gscore').textContent = player.score;
  }
}
function playerDrop(){
  player.pos.y++;
  if(collide(arena,player)){
    player.pos.y--;
    merge(arena,player);
    playerReset();
    arenaSweep();
  }
  dropCounter=0;
}
function playerMove(dir){
  player.pos.x += dir;
  if(collide(arena,player)) player.pos.x -= dir;
}
function rotate(matrix,dir){
  for(let y=0;y<matrix.length;y++) for(let x=0;x<y;x++) [matrix[x][y],matrix[y][x]]=[matrix[y][x],matrix[x][y]];
  if(dir>0) matrix.forEach(r=>r.reverse()); else matrix.reverse();
}
function playerRotate(dir){
  const pos = player.pos.x;
  rotate(player.matrix,dir);
  let offset = 1;
  while(collide(arena,player)){
    player.pos.x += offset;
    offset = -(offset + (offset>0?1:-1));
    if(offset > player.matrix[0].length){ rotate(player.matrix,-dir); player.pos.x = pos; return; }
  }
}
function drawMatrix(mat, offset){
  mat.forEach((row,y)=>row.forEach((val,x)=>{
    if(val!==0){
      ctx.fillStyle = colors[val] || '#fff';
      ctx.fillRect((x+offset.x)*BLOCK,(y+offset.y)*BLOCK,BLOCK,BLOCK);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeRect((x+offset.x)*BLOCK,(y+offset.y)*BLOCK,BLOCK,BLOCK);
    }
  }));
}
function draw(){
  ctx.fillStyle='#07101a';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  drawMatrix(arena,{x:0,y:0});
  drawMatrix(player.matrix,player.pos);
}
function update(time=0){
  const delta = time - lastTime;
  lastTime = time;
  dropCounter += delta;
  const speed = [1,1.5,2,3][difficulty-1];
  if(dropCounter > dropInterval / speed) playerDrop();
  draw();
  requestAnimationFrame(update);
}
document.addEventListener('keydown',e=>{
  if(e.key==='ArrowLeft') playerMove(-1);
  if(e.key==='ArrowRight') playerMove(1);
  if(e.key==='ArrowDown') playerDrop();
  if(e.key==='w') playerRotate(1);
  if(e.key==='q') playerRotate(-1);
});
document.getElementById('leftBtn').addEventListener('touchstart',()=>playerMove(-1));
document.getElementById('rightBtn').addEventListener('touchstart',()=>playerMove(1));
document.getElementById('downBtn').addEventListener('touchstart',()=>playerDrop());
document.getElementById('rotateBtn').addEventListener('touchstart',()=>playerRotate(1));
document.getElementById('btnRestart').addEventListener('click',()=>{
  arena = createMatrix(COLS,ROWS);
  player.score = 0;
  playerReset();
});
document.getElementById('btnDifficulty').addEventListener('click',()=>{
  const choice = prompt('Scegli difficoltà:\n1=Easy\n2=Medium\n3=Hard\n4=Extreme', difficulty);
  const v = parseInt(choice);
  if(v>=1 && v<=4) difficulty=v;
});
playerReset();
update();