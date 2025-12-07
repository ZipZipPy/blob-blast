/**
 * Socket - Socket.io client wrapper for multiplayer networking
 */
import { io } from 'socket.io-client';

export class Socket {
    constructor() {
        // Use environment variable for server URL, fallback to localhost
        const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

        this.socket = io(serverUrl, {
            transports: ['websocket', 'polling']
        });

        this.callbacks = {};

        // Debug logging
        this.socket.on('connect', () => {
            console.log('Connected to server:', this.socket.id);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
        });
    }

    // Create a new room
    createRoom(callback) {
        this.socket.emit('createRoom');
        this.socket.once('roomCreated', (data) => {
            callback(data);
        });
    }

    // Join an existing room
    joinRoom(roomCode, callback) {
        this.socket.emit('joinRoom', roomCode);
        this.socket.once('joinResult', (data) => {
            callback(data);
        });
    }

    // Listen for game start (when 2 players join)
    onGameStart(callback) {
        this.socket.on('gameStart', callback);
    }

    // Listen for game state updates
    onGameState(callback) {
        this.socket.on('gameState', callback);
    }

    // Listen for game over
    onGameOver(callback) {
        this.socket.on('gameOver', callback);
    }

    // Listen for opponent disconnect
    onOpponentDisconnect(callback) {
        this.socket.on('opponentDisconnect', callback);
    }

    // Listen for game restart
    onGameRestart(callback) {
        this.socket.on('gameRestart', callback);
    }

    // Listen for rematch pending (one player clicked Play Again)
    onRematchPending(callback) {
        this.socket.on('rematchPending', callback);
    }

    // Send player input to server
    emit(event, data) {
        this.socket.emit(event, data);
    }

    // Get socket ID (player ID)
    getId() {
        return this.socket.id;
    }

    // Disconnect
    disconnect() {
        this.socket.disconnect();
    }

    // Reconnect
    reconnect() {
        this.socket.connect();
    }
}
