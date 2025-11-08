const boardEl = document.getElementById('board');
let grid = Array(9).fill('');
let turn = 'O';
let active = true;
let scoreO = 0, scoreX = 0;
let vsAI = false;
let aiDifficulty = null; // "strong" o "unbeatable"

const scoreOEl = document.getElementById('scoreO');
const scoreXEl = document.getElementById('scoreX');
const statusEl = document.getElementById('status');

function renderBoard() {
  boardEl.innerHTML = '';
  grid.forEach((v, i) => {
    const c = document.createElement('div');
    c.className = 'cell';
    c.dataset.i = i;
    const s = document.createElement('span');
    s.textContent = v;
    c.appendChild(s);
    c.addEventListener('click', () => cellClick(i));
    boardEl.appendChild(c);
  });
}

function cellClick(i) {
  if (!active || grid[i] !== '') return;
  grid[i] = turn;
  renderBoard();

  const w = checkWinner();
  if (w) {
    active = false;
    setTimeout(() => endRound(w), 300);
    return;
  }

  if (!grid.includes('')) {
    active = false;
    statusEl.textContent = 'Pareggio';
    setTimeout(resetRound, 900);
    return;
  }

  turn = (turn === 'O') ? 'X' : 'O';
  statusEl.textContent = 'Turno: ' + turn;

  if (vsAI && turn === 'X' && active) {
    setTimeout(aiMove, 500);
  }
}

function aiMove() {
  if (!active) return;
  let move = null;

  if (aiDifficulty === "strong") {
    // AI migliorata ma non perfetta
    const chanceSmart = 0.85; // 85% gioca intelligente
    const smart = Math.random() < chanceSmart;
    if (smart) {
      move = findBestMove('X') || findBestMove('O') || centerOrCorner();
    }
    if (move === null) {
      const empty = grid.map((v, i) => v === '' ? i : null).filter(v => v !== null);
      move = empty[Math.floor(Math.random() * empty.length)];
    }
  } else if (aiDifficulty === "unbeatable") {
    // Modalità imbattibile con minimax
    move = findBestMoveMinimax();
  } else {
    // fallback vecchia logica
    const smart = Math.random() > 0.4;
    if (smart) move = findBestMove('X') || findBestMove('O');
    if (move === null) {
      const empty = grid.map((v, i) => v === '' ? i : null).filter(v => v !== null);
      move = empty[Math.floor(Math.random() * empty.length)];
    }
  }

  grid[move] = 'X';
  renderBoard();

  const w = checkWinner();
  if (w) {
    active = false;
    setTimeout(() => endRound(w), 300);
    return;
  }

  if (!grid.includes('')) {
    active = false;
    statusEl.textContent = 'Pareggio';
    setTimeout(resetRound, 900);
    return;
  }

  turn = 'O';
  statusEl.textContent = 'Turno: O';
}

// IA “quasi perfetta” con minimax
function findBestMoveMinimax() {
  let bestScore = -Infinity;
  let move;
  for (let i = 0; i < 9; i++) {
    if (grid[i] === '') {
      grid[i] = 'X';
      let score = minimax(grid, 0, false);
      grid[i] = '';
      if (score > bestScore) {
        bestScore = score;
        move = i;
      }
    }
  }
  return move;
}

function minimax(board, depth, isMaximizing) {
  const winner = checkWinner();
  if (winner === 'X') return 10 - depth;
  if (winner === 'O') return depth - 10;
  if (!board.includes('')) return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === '') {
        board[i] = 'X';
        best = Math.max(best, minimax(board, depth + 1, false));
        board[i] = '';
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === '') {
        board[i] = 'O';
        best = Math.min(best, minimax(board, depth + 1, true));
        board[i] = '';
      }
    }
    return best;
  }
}

function centerOrCorner() {
  if (grid[4] === '') return 4; // centro
  const corners = [0, 2, 6, 8].filter(i => grid[i] === '');
  return corners.length ? corners[Math.floor(Math.random() * corners.length)] : null;
}

function findBestMove(player) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  for (let [a, b, c] of lines) {
    const line = [grid[a], grid[b], grid[c]];
    if (line.filter(v => v === player).length === 2 && line.includes('')) {
      return [a, b, c][line.indexOf('')];
    }
  }
  return null;
}

function checkWinner() {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  for (let line of lines) {
    const [a, b, c] = line;
    if (grid[a] && grid[a] === grid[b] && grid[a] === grid[c]) return grid[a];
  }
  return null;
}

function endRound(winner) {
  if (winner === 'O') scoreO++; else scoreX++;
  scoreOEl.textContent = scoreO;
  scoreXEl.textContent = scoreX;
  statusEl.textContent = `Vince il round: ${winner}`;

  if (scoreO >= 3 || scoreX >= 3) {
    setTimeout(() => {
      statusEl.textContent = `Vince la partita: ${winner}`;
      setTimeout(() => {
        scoreO = 0; scoreX = 0;
        scoreOEl.textContent = '0'; scoreXEl.textContent = '0';
        resetRound();
      }, 1000);
    }, 500);
  } else {
    setTimeout(resetRound, 900);
  }
}

function resetRound() {
  grid = Array(9).fill('');
  turn = 'O';
  active = true;
  statusEl.textContent = 'Turno: O';
  renderBoard();
  if (vsAI && turn === 'X') setTimeout(aiMove, 500);
}

document.getElementById('btnResetRound').addEventListener('click', resetRound);

// Selezione modalità
document.getElementById('btnLocal').addEventListener('click', () => startMode(false));
document.getElementById('btnAI').addEventListener('click', () => chooseDifficulty());

function chooseDifficulty() {
  const diff = prompt("Scegli difficoltà:\n1 - Umana ma forte\n2 - Imbattibile");
  if (diff === '1') aiDifficulty = "strong";
  else if (diff === '2') aiDifficulty = "unbeatable";
  else return;
  startMode(true);
}

function startMode(ai) {
  vsAI = ai;
  document.getElementById('modeSelect').style.display = 'none';
  boardEl.style.display = 'grid';
  resetRound();
  statusEl.textContent = ai ? 'Turno: O (VS AI)' : 'Turno: O';
}

renderBoard();
