/**
 * Game - Main game loop and state management
 */
export class Game {
    constructor(canvas, socket) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.socket = socket;

        // Canvas size
        this.width = 800;
        this.height = 600;
        canvas.width = this.width;
        canvas.height = this.height;

        // Game state
        this.players = {};
        this.bullets = [];
        this.localPlayerId = null;
        this.isRunning = false;
        this.scores = { player1: 0, player2: 0 };

        // Input state
        this.keys = {};
        this.mousePos = { x: 0, y: 0 };
        this.lastShootTime = 0;
        this.shootCooldown = 300; // ms

        // Arena obstacles
        this.obstacles = this.createObstacles();

        // Bind input handlers
        this.bindInputs();
    }

    createObstacles() {
        return [
            // Center obstacles
            { x: 350, y: 250, width: 100, height: 100 },
            // Corner obstacles
            { x: 100, y: 100, width: 80, height: 80 },
            { x: 620, y: 100, width: 80, height: 80 },
            { x: 100, y: 420, width: 80, height: 80 },
            { x: 620, y: 420, width: 80, height: 80 },
        ];
    }

    bindInputs() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        // Mouse
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos.x = e.clientX - rect.left;
            this.mousePos.y = e.clientY - rect.top;
        });

        this.canvas.addEventListener('click', () => {
            this.shoot();
        });
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShootTime < this.shootCooldown) return;
        if (!this.localPlayerId || !this.players[this.localPlayerId]) return;

        this.lastShootTime = now;

        const player = this.players[this.localPlayerId];
        const angle = Math.atan2(
            this.mousePos.y - player.y,
            this.mousePos.x - player.x
        );

        this.socket.emit('shoot', {
            x: player.x,
            y: player.y,
            angle: angle,
            playerId: this.localPlayerId
        });
    }

    setLocalPlayer(playerId) {
        this.localPlayerId = playerId;
    }

    updateGameState(state) {
        if (state.players) {
            this.players = state.players;
        }
        if (state.bullets) {
            this.bullets = state.bullets;
        }
        if (state.scores) {
            this.scores = state.scores;
            this.updateScoreUI();
        }
    }

    updateScoreUI() {
        const localPlayerNum = this.getLocalPlayerNumber();
        if (localPlayerNum === 1) {
            document.getElementById('player1-score').textContent = this.scores.player1;
            document.getElementById('player2-score').textContent = this.scores.player2;
        } else {
            document.getElementById('player1-score').textContent = this.scores.player2;
            document.getElementById('player2-score').textContent = this.scores.player1;
        }
    }

    getLocalPlayerNumber() {
        const playerIds = Object.keys(this.players);
        return playerIds.indexOf(this.localPlayerId) + 1;
    }

    start() {
        this.isRunning = true;
        this.gameLoop();
    }

    stop() {
        this.isRunning = false;
    }

    reset() {
        // Completely reset game state for a fresh start
        this.players = {};
        this.bullets = [];
        this.scores = { player1: 0, player2: 0 };
        this.lastShootTime = 0;
        this.updateScoreUI();
    }

    gameLoop() {
        if (!this.isRunning) return;

        this.update();
        this.render();

        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        // Send input to server
        const input = {
            up: this.keys['w'] || this.keys['arrowup'],
            down: this.keys['s'] || this.keys['arrowdown'],
            left: this.keys['a'] || this.keys['arrowleft'],
            right: this.keys['d'] || this.keys['arrowright'],
            mouseX: this.mousePos.x,
            mouseY: this.mousePos.y
        };

        this.socket.emit('input', input);
    }

    render() {
        const ctx = this.ctx;

        // Clear canvas
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(0, 0, this.width, this.height);

        // Draw grid pattern
        this.drawGrid();

        // Draw obstacles
        this.drawObstacles();

        // Draw bullets
        this.drawBullets();

        // Draw players
        this.drawPlayers();
    }

    drawGrid() {
        const ctx = this.ctx;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;

        const gridSize = 40;
        for (let x = 0; x < this.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();
        }
        for (let y = 0; y < this.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }
    }

    drawObstacles() {
        const ctx = this.ctx;

        this.obstacles.forEach(obs => {
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(obs.x + 4, obs.y + 4, obs.width, obs.height);

            // Main block
            const gradient = ctx.createLinearGradient(obs.x, obs.y, obs.x, obs.y + obs.height);
            gradient.addColorStop(0, '#6366f1');
            gradient.addColorStop(1, '#4f46e5');
            ctx.fillStyle = gradient;
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

            // Highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(obs.x, obs.y, obs.width, 4);
        });
    }

    drawBullets() {
        const ctx = this.ctx;
        const playerIds = Object.keys(this.players);

        this.bullets.forEach(bullet => {
            // Determine bullet color based on player index (same as player colors)
            // Player 0 (first to join/host) = purple, Player 1 (joiner) = blue
            const playerIndex = playerIds.indexOf(bullet.playerId);
            const isPurple = playerIndex === 0;

            // Glow effect
            const gradient = ctx.createRadialGradient(
                bullet.x, bullet.y, 0,
                bullet.x, bullet.y, 15
            );

            if (isPurple) {
                gradient.addColorStop(0, 'rgba(192, 132, 252, 0.8)');
                gradient.addColorStop(1, 'rgba(192, 132, 252, 0)');
            } else {
                gradient.addColorStop(0, 'rgba(96, 165, 250, 0.8)');
                gradient.addColorStop(1, 'rgba(96, 165, 250, 0)');
            }

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, 15, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = isPurple ? '#c084fc' : '#60a5fa';
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, 6, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    drawPlayers() {
        const ctx = this.ctx;
        const playerIds = Object.keys(this.players);

        playerIds.forEach((playerId, index) => {
            const player = this.players[playerId];
            const isLocal = playerId === this.localPlayerId;
            const color = index === 0 ? '#a855f7' : '#3b82f6';
            const lightColor = index === 0 ? '#c084fc' : '#60a5fa';

            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(player.x, player.y + 25, 20, 8, 0, 0, Math.PI * 2);
            ctx.fill();

            // Body (blob)
            const bodyGradient = ctx.createRadialGradient(
                player.x - 5, player.y - 5, 0,
                player.x, player.y, 25
            );
            bodyGradient.addColorStop(0, lightColor);
            bodyGradient.addColorStop(1, color);

            ctx.fillStyle = bodyGradient;
            ctx.beginPath();
            ctx.arc(player.x, player.y, 25, 0, Math.PI * 2);
            ctx.fill();

            // Outline for local player
            if (isLocal) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 3;
                ctx.stroke();
            }

            // Eyes
            const eyeAngle = player.angle || 0;
            const eyeOffset = 5;
            const eyeX = Math.cos(eyeAngle) * eyeOffset;
            const eyeY = Math.sin(eyeAngle) * eyeOffset;

            // Left eye
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(player.x - 8 + eyeX * 0.5, player.y - 3 + eyeY * 0.5, 7, 0, Math.PI * 2);
            ctx.fill();

            // Right eye
            ctx.beginPath();
            ctx.arc(player.x + 8 + eyeX * 0.5, player.y - 3 + eyeY * 0.5, 7, 0, Math.PI * 2);
            ctx.fill();

            // Pupils (follow mouse direction)
            ctx.fillStyle = '#1f2937';
            ctx.beginPath();
            ctx.arc(player.x - 8 + eyeX, player.y - 3 + eyeY, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(player.x + 8 + eyeX, player.y - 3 + eyeY, 3, 0, Math.PI * 2);
            ctx.fill();

            // Cheeks (blush)
            ctx.fillStyle = 'rgba(244, 114, 182, 0.4)';
            ctx.beginPath();
            ctx.ellipse(player.x - 18, player.y + 5, 5, 3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(player.x + 18, player.y + 5, 5, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Cute mouth
            ctx.strokeStyle = '#1f2937';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(player.x, player.y + 8, 5, 0.1 * Math.PI, 0.9 * Math.PI);
            ctx.stroke();
        });
    }
}
