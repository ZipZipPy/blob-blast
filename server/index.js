/**
 * Blob Blast - Game Server
 * Express + Socket.io for real-time multiplayer
 */
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './RoomManager.js';

const app = express();
const server = createServer(app);

// CORS configuration
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:4173',
    process.env.CLIENT_URL
].filter(Boolean);

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST']
    }
});

app.use(cors({
    origin: allowedOrigins
}));

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ status: 'ok', game: 'Blob Blast Server' });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

// Room manager
const roomManager = new RoomManager();

// Game constants
const GAME_CONFIG = {
    PLAYER_SPEED: 5,
    BULLET_SPEED: 10,
    PLAYER_SIZE: 25,
    BULLET_SIZE: 6,
    ARENA_WIDTH: 800,
    ARENA_HEIGHT: 600,
    SHOOT_COOLDOWN: 300,
    POINTS_TO_WIN: 5,
    TICK_RATE: 30 // Updates per second
};

// Obstacles (same as client)
const OBSTACLES = [
    { x: 350, y: 250, width: 100, height: 100 },
    { x: 100, y: 100, width: 80, height: 80 },
    { x: 620, y: 100, width: 80, height: 80 },
    { x: 100, y: 420, width: 80, height: 80 },
    { x: 620, y: 420, width: 80, height: 80 },
];

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Create a new room
    socket.on('createRoom', () => {
        const roomCode = roomManager.createRoom(socket.id);
        socket.join(roomCode);
        socket.roomCode = roomCode;

        socket.emit('roomCreated', {
            success: true,
            roomCode: roomCode
        });

        console.log(`Room created: ${roomCode} by ${socket.id}`);
    });

    // Join an existing room
    socket.on('joinRoom', (roomCode) => {
        const room = roomManager.getRoom(roomCode);

        if (!room) {
            socket.emit('joinResult', {
                success: false,
                error: 'Room not found'
            });
            return;
        }

        if (room.players.length >= 2) {
            socket.emit('joinResult', {
                success: false,
                error: 'Room is full'
            });
            return;
        }

        // Add player to room
        roomManager.joinRoom(roomCode, socket.id);
        socket.join(roomCode);
        socket.roomCode = roomCode;

        socket.emit('joinResult', {
            success: true,
            roomCode: roomCode
        });

        console.log(`Player ${socket.id} joined room ${roomCode}`);

        // If room is now full, start the game
        if (room.players.length === 2) {
            startGame(roomCode);
        }
    });

    // Player input
    socket.on('input', (input) => {
        const room = roomManager.getRoom(socket.roomCode);
        if (!room || !room.gameState) return;

        const player = room.gameState.players[socket.id];
        if (!player) return;

        // Calculate movement
        let dx = 0, dy = 0;
        if (input.up) dy -= 1;
        if (input.down) dy += 1;
        if (input.left) dx -= 1;
        if (input.right) dx += 1;

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len;
            dy /= len;
        }

        // Apply movement
        const newX = player.x + dx * GAME_CONFIG.PLAYER_SPEED;
        const newY = player.y + dy * GAME_CONFIG.PLAYER_SPEED;

        // Boundary collision
        const margin = GAME_CONFIG.PLAYER_SIZE;
        if (newX > margin && newX < GAME_CONFIG.ARENA_WIDTH - margin) {
            if (!checkObstacleCollision(newX, player.y, GAME_CONFIG.PLAYER_SIZE)) {
                player.x = newX;
            }
        }
        if (newY > margin && newY < GAME_CONFIG.ARENA_HEIGHT - margin) {
            if (!checkObstacleCollision(player.x, newY, GAME_CONFIG.PLAYER_SIZE)) {
                player.y = newY;
            }
        }

        // Update aim angle
        player.angle = Math.atan2(input.mouseY - player.y, input.mouseX - player.x);
    });

    // Player shoots
    socket.on('shoot', (data) => {
        const room = roomManager.getRoom(socket.roomCode);
        if (!room || !room.gameState) return;

        const player = room.gameState.players[socket.id];
        if (!player) return;

        // Check cooldown
        const now = Date.now();
        if (now - player.lastShot < GAME_CONFIG.SHOOT_COOLDOWN) return;
        player.lastShot = now;

        // Create bullet
        room.gameState.bullets.push({
            id: `${socket.id}-${now}`,
            x: data.x,
            y: data.y,
            vx: Math.cos(data.angle) * GAME_CONFIG.BULLET_SPEED,
            vy: Math.sin(data.angle) * GAME_CONFIG.BULLET_SPEED,
            playerId: socket.id
        });
    });

    // Leave room
    socket.on('leaveRoom', () => {
        handlePlayerLeave(socket);
    });

    // Play again
    socket.on('playAgain', () => {
        const room = roomManager.getRoom(socket.roomCode);
        if (!room) return;

        room.playAgainVotes = room.playAgainVotes || new Set();
        room.playAgainVotes.add(socket.id);

        // Notify the other player that this player wants to rematch
        socket.to(socket.roomCode).emit('rematchPending');

        // If both players want to play again
        if (room.playAgainVotes.size === 2) {
            room.playAgainVotes.clear();
            resetGame(socket.roomCode);
            io.to(socket.roomCode).emit('gameRestart', { roomCode: socket.roomCode });
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        handlePlayerLeave(socket);
    });
});

function startGame(roomCode) {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    // Initialize game state
    room.gameState = {
        players: {},
        bullets: [],
        scores: { player1: 0, player2: 0 }
    };

    // Set initial player positions
    room.players.forEach((playerId, index) => {
        room.gameState.players[playerId] = {
            x: index === 0 ? 100 : 700,
            y: 300,
            angle: index === 0 ? 0 : Math.PI,
            lastShot: 0
        };
    });

    // Notify all players
    io.to(roomCode).emit('gameStart', { roomCode });

    // Start game loop
    room.gameLoop = setInterval(() => {
        updateGame(roomCode);
    }, 1000 / GAME_CONFIG.TICK_RATE);

    console.log(`Game started in room ${roomCode}`);
}

function updateGame(roomCode) {
    const room = roomManager.getRoom(roomCode);
    if (!room || !room.gameState) return;

    // Update bullets
    room.gameState.bullets = room.gameState.bullets.filter(bullet => {
        // Move bullet
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;

        // Check boundary
        if (bullet.x < 0 || bullet.x > GAME_CONFIG.ARENA_WIDTH ||
            bullet.y < 0 || bullet.y > GAME_CONFIG.ARENA_HEIGHT) {
            return false;
        }

        // Check obstacle collision
        if (checkObstacleCollision(bullet.x, bullet.y, GAME_CONFIG.BULLET_SIZE)) {
            return false;
        }

        // Check player collision
        for (const playerId of Object.keys(room.gameState.players)) {
            if (playerId === bullet.playerId) continue; // Can't hit yourself

            const player = room.gameState.players[playerId];
            const dx = bullet.x - player.x;
            const dy = bullet.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < GAME_CONFIG.PLAYER_SIZE + GAME_CONFIG.BULLET_SIZE) {
                // Hit!
                const shooterIndex = room.players.indexOf(bullet.playerId);
                if (shooterIndex === 0) {
                    room.gameState.scores.player1++;
                } else {
                    room.gameState.scores.player2++;
                }

                // Reset player position
                const playerIndex = room.players.indexOf(playerId);
                player.x = playerIndex === 0 ? 100 : 700;
                player.y = 300;

                // Check win condition
                if (room.gameState.scores.player1 >= GAME_CONFIG.POINTS_TO_WIN ||
                    room.gameState.scores.player2 >= GAME_CONFIG.POINTS_TO_WIN) {
                    endGame(roomCode);
                }

                return false; // Remove bullet
            }
        }

        return true;
    });

    // Broadcast game state
    io.to(roomCode).emit('gameState', {
        players: room.gameState.players,
        bullets: room.gameState.bullets,
        scores: room.gameState.scores
    });
}

function checkObstacleCollision(x, y, size) {
    for (const obs of OBSTACLES) {
        if (x + size > obs.x && x - size < obs.x + obs.width &&
            y + size > obs.y && y - size < obs.y + obs.height) {
            return true;
        }
    }
    return false;
}

function endGame(roomCode) {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    // Stop game loop
    if (room.gameLoop) {
        clearInterval(room.gameLoop);
        room.gameLoop = null;
    }

    // Determine winner
    const winner = room.gameState.scores.player1 >= GAME_CONFIG.POINTS_TO_WIN
        ? room.players[0]
        : room.players[1];

    io.to(roomCode).emit('gameOver', {
        winner: winner,
        scores: room.gameState.scores
    });

    console.log(`Game ended in room ${roomCode}`);
}

function resetGame(roomCode) {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    // Reset game state
    room.gameState = {
        players: {},
        bullets: [],
        scores: { player1: 0, player2: 0 }
    };

    // Reset player positions
    room.players.forEach((playerId, index) => {
        room.gameState.players[playerId] = {
            x: index === 0 ? 100 : 700,
            y: 300,
            angle: index === 0 ? 0 : Math.PI,
            lastShot: 0
        };
    });

    // Restart game loop
    room.gameLoop = setInterval(() => {
        updateGame(roomCode);
    }, 1000 / GAME_CONFIG.TICK_RATE);
}

function handlePlayerLeave(socket) {
    const roomCode = socket.roomCode;
    if (!roomCode) return;

    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    // Stop game loop
    if (room.gameLoop) {
        clearInterval(room.gameLoop);
    }

    // Notify other player
    socket.to(roomCode).emit('opponentDisconnect');

    // Clean up room
    roomManager.removeRoom(roomCode);

    console.log(`Room ${roomCode} destroyed`);
}

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🎮 Blob Blast server running on port ${PORT}`);
});
