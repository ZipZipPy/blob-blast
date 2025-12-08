/**
 * Main entry point for Blob Blast
 */
import './style.css';
import { Game } from './game/Game.js';
import { Socket } from './network/Socket.js';
import { Lobby } from './ui/Lobby.js';

// Initialize socket connection
const socket = new Socket();

// Game instance
let game = null;
let isHost = false; // Track if this player is the host (created the room)

// Set up global socket listeners (only once - to avoid listener accumulation)
socket.onGameRestart((data) => {
  console.log('Game restart received', data);

  document.getElementById('game-over').classList.remove('active');
  document.getElementById('game-screen').classList.add('active');

  // Reset Play Again button for both players
  const btn = document.getElementById('play-again-btn');
  btn.innerHTML = '<span class="btn-icon">🔄</span> Play Again';
  btn.disabled = false;

  if (game) {
    // Reset game state completely
    game.reset();
    game.start();
  }
});

socket.onRematchPending(() => {
  // Other player wants rematch - show message but keep button enabled
  const btn = document.getElementById('play-again-btn');
  btn.innerHTML = '<span class="btn-icon">✅</span> Accept Rematch';
  // Don't disable - let this player click to accept
});

// Set up game state and game over listeners ONCE at the top level
// This prevents listener accumulation when starting new games from lobby
socket.onGameState((state) => {
  if (game) {
    game.updateGameState(state);
  }
});

socket.onGameOver((data) => {
  handleGameOver(data);
});

// Initialize lobby with game start callback
const lobby = new Lobby(socket, (data) => {
  // Determine if this player is the host based on room creation
  isHost = data.isHost || false;

  // Stop and reset any existing game before creating a new one
  if (game) {
    game.stop();
    game.reset();
  }

  // Create game instance
  const canvas = document.getElementById('game-canvas');
  game = new Game(canvas, socket);
  game.setLocalPlayer(socket.getId());
  game.setIsHost(isHost);

  // Update HUD to show correct player colors/labels
  updateHUDForPlayer(isHost);

  // Start game - listeners are already set up at top level
  game.start();
});

// Update HUD labels based on whether player is host or joiner
function updateHUDForPlayer(isHost) {
  const player1Section = document.querySelector('.player1-score');
  const player2Section = document.querySelector('.player2-score');

  if (isHost) {
    // Host is purple (left side) - already correct in HTML
    player1Section.querySelector('.player-blob').textContent = '🟣';
    player1Section.querySelector('.score-label').textContent = 'You';
    player2Section.querySelector('.player-blob').textContent = '🔵';
    player2Section.querySelector('.score-label').textContent = 'Opponent';
  } else {
    // Joiner is blue - swap the display
    player1Section.querySelector('.player-blob').textContent = '🔵';
    player1Section.querySelector('.score-label').textContent = 'You';
    player2Section.querySelector('.player-blob').textContent = '🟣';
    player2Section.querySelector('.score-label').textContent = 'Opponent';
  }
}

// Game over handling
function handleGameOver(data) {
  if (game) {
    game.stop();
  }

  const gameOverScreen = document.getElementById('game-over');
  const gameScreen = document.getElementById('game-screen');
  const resultText = document.getElementById('game-result');
  const finalScore1 = document.getElementById('final-score-1');
  const finalScore2 = document.getElementById('final-score-2');

  // Calculate scores based on who this player is
  const myScore = isHost ? data.scores.player1 : data.scores.player2;
  const opponentScore = isHost ? data.scores.player2 : data.scores.player1;
  const won = data.winner === socket.getId();

  // Update emojis based on who we are (left side = you, right side = opponent)
  document.getElementById('final-emoji-1').textContent = isHost ? '🟣' : '🔵';
  document.getElementById('final-emoji-2').textContent = isHost ? '🔵' : '🟣';

  // Update UI
  resultText.textContent = won ? '🎉 You Win!' : '😢 You Lose!';
  resultText.className = 'game-result ' + (won ? 'win' : 'lose');
  finalScore1.textContent = myScore;
  finalScore2.textContent = opponentScore;

  // Reset Play Again button
  const btn = document.getElementById('play-again-btn');
  btn.innerHTML = '<span class="btn-icon">🔄</span> Play Again';
  btn.disabled = false;

  // Show game over screen
  gameScreen.classList.remove('active');
  gameOverScreen.classList.add('active');
}

// Play again button
document.getElementById('play-again-btn').addEventListener('click', () => {
  // Disable button and show waiting state for the player who clicked
  const btn = document.getElementById('play-again-btn');
  btn.innerHTML = '<span class="btn-icon">⏳</span> Waiting for opponent...';
  btn.disabled = true;

  socket.emit('playAgain');
});

// Back to lobby button
document.getElementById('back-to-lobby-btn').addEventListener('click', () => {
  // Stop and reset game before returning to lobby
  // This ensures bullet positions and other state are cleared
  if (game) {
    game.stop();
    game.reset();
  }

  lobby.returnToLobby();
  socket.emit('leaveRoom');

  // Reset Play Again button
  const btn = document.getElementById('play-again-btn');
  btn.innerHTML = '<span class="btn-icon">🔄</span> Play Again';
  btn.disabled = false;

  // Reset host status
  isHost = false;
});

console.log('🎮 Blob Blast loaded!');
