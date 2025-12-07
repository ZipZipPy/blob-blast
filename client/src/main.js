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

// Set up global socket listeners (only once)
socket.onGameRestart((data) => {
  console.log('Game restart received', data);

  document.getElementById('game-over').classList.remove('active');
  document.getElementById('game-screen').classList.add('active');

  if (game) {
    // Reset game state completely
    game.reset();
    game.start();
  }
});

socket.onRematchPending(() => {
  // Show waiting for opponent message on Play Again button
  const btn = document.getElementById('play-again-btn');
  btn.innerHTML = '<span class="btn-icon">⏳</span> Waiting for opponent...';
  btn.disabled = true;
});

// Initialize lobby with game start callback
const lobby = new Lobby(socket, (data) => {
  // Create game instance
  const canvas = document.getElementById('game-canvas');
  game = new Game(canvas, socket);
  game.setLocalPlayer(socket.getId());

  // IMPORTANT: Set up listeners BEFORE starting the game to avoid missing early state updates
  // Listen for game state updates
  socket.onGameState((state) => {
    game.updateGameState(state);
  });

  // Listen for game over
  socket.onGameOver((data) => {
    handleGameOver(data);
  });

  // Start game AFTER listeners are set up
  game.start();
});

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

  // Determine if local player won
  const localPlayerNum = game.getLocalPlayerNumber();
  const localScore = localPlayerNum === 1 ? data.scores.player1 : data.scores.player2;
  const opponentScore = localPlayerNum === 1 ? data.scores.player2 : data.scores.player1;
  const won = data.winner === socket.getId();

  // Update UI
  resultText.textContent = won ? '🎉 You Win!' : '😢 You Lose!';
  resultText.className = 'game-result ' + (won ? 'win' : 'lose');
  finalScore1.textContent = localScore;
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
  socket.emit('playAgain');
});

// Back to lobby button
document.getElementById('back-to-lobby-btn').addEventListener('click', () => {
  lobby.returnToLobby();
  socket.emit('leaveRoom');

  // Reset Play Again button
  const btn = document.getElementById('play-again-btn');
  btn.innerHTML = '<span class="btn-icon">🔄</span> Play Again';
  btn.disabled = false;
});

console.log('🎮 Blob Blast loaded!');
