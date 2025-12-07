/**
 * Lobby UI - Handles room creation and joining
 */
export class Lobby {
    constructor(socket, onGameStart) {
        this.socket = socket;
        this.onGameStart = onGameStart;

        // UI Elements
        this.lobbyScreen = document.getElementById('lobby');
        this.gameScreen = document.getElementById('game-screen');
        this.createRoomBtn = document.getElementById('create-room-btn');
        this.joinRoomBtn = document.getElementById('join-room-btn');
        this.roomCodeInput = document.getElementById('room-code-input');
        this.waitingMessage = document.getElementById('waiting-message');
        this.displayRoomCode = document.getElementById('display-room-code');
        this.errorMessage = document.getElementById('error-message');
        this.gameRoomCode = document.getElementById('game-room-code');

        this.bindEvents();
        this.setupSocketListeners();
    }

    bindEvents() {
        // Create room button
        this.createRoomBtn.addEventListener('click', () => {
            this.createRoom();
        });

        // Join room button
        this.joinRoomBtn.addEventListener('click', () => {
            this.joinRoom();
        });

        // Room code input - auto uppercase and handle enter key
        this.roomCodeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });

        this.roomCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.joinRoom();
            }
        });
    }

    setupSocketListeners() {
        // When game starts (both players ready)
        this.socket.onGameStart((data) => {
            this.startGame(data);
        });

        // When opponent disconnects
        this.socket.onOpponentDisconnect(() => {
            this.showError('Opponent disconnected! Returning to lobby...');
            setTimeout(() => {
                this.returnToLobby();
            }, 2000);
        });
    }

    createRoom() {
        this.hideError();
        this.disableButtons();
        this.isHost = true; // Player who creates the room is the host

        this.socket.createRoom((data) => {
            if (data.success) {
                this.showWaiting(data.roomCode);
            } else {
                this.showError(data.error || 'Failed to create room');
                this.enableButtons();
                this.isHost = false;
            }
        });
    }

    joinRoom() {
        const roomCode = this.roomCodeInput.value.trim().toUpperCase();

        if (roomCode.length !== 4) {
            this.showError('Please enter a 4-letter room code');
            return;
        }

        this.hideError();
        this.disableButtons();
        this.isHost = false; // Player who joins is not the host

        this.socket.joinRoom(roomCode, (data) => {
            if (data.success) {
                // Will wait for gameStart event
                this.showWaiting(roomCode);
            } else {
                this.showError(data.error || 'Failed to join room');
                this.enableButtons();
            }
        });
    }

    showWaiting(roomCode) {
        this.displayRoomCode.textContent = roomCode;
        this.waitingMessage.classList.remove('hidden');
    }

    hideWaiting() {
        this.waitingMessage.classList.add('hidden');
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.classList.remove('hidden');
    }

    hideError() {
        this.errorMessage.classList.add('hidden');
    }

    disableButtons() {
        this.createRoomBtn.disabled = true;
        this.joinRoomBtn.disabled = true;
        this.roomCodeInput.disabled = true;
    }

    enableButtons() {
        this.createRoomBtn.disabled = false;
        this.joinRoomBtn.disabled = false;
        this.roomCodeInput.disabled = false;
    }

    startGame(data) {
        this.hideWaiting();
        this.lobbyScreen.classList.remove('active');
        this.gameScreen.classList.add('active');
        this.gameRoomCode.textContent = data.roomCode;

        // Call the game start callback with isHost info
        this.onGameStart({ ...data, isHost: this.isHost });
    }

    returnToLobby() {
        this.hideWaiting();
        this.hideError();
        this.enableButtons();
        this.roomCodeInput.value = '';

        document.getElementById('game-over').classList.remove('active');
        this.gameScreen.classList.remove('active');
        this.lobbyScreen.classList.add('active');

        // Reset scores UI
        document.getElementById('player1-score').textContent = '0';
        document.getElementById('player2-score').textContent = '0';
    }
}
