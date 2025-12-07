/**
 * RoomManager - Manages game rooms for multiplayer
 */
export class RoomManager {
    constructor() {
        this.rooms = new Map();
    }

    /**
     * Generate a random 4-letter room code
     */
    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excluding I and O to avoid confusion
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    /**
     * Create a new room
     */
    createRoom(hostId) {
        let roomCode;

        // Generate unique code
        do {
            roomCode = this.generateRoomCode();
        } while (this.rooms.has(roomCode));

        // Create room
        this.rooms.set(roomCode, {
            code: roomCode,
            host: hostId,
            players: [hostId],
            gameState: null,
            gameLoop: null,
            createdAt: Date.now()
        });

        return roomCode;
    }

    /**
     * Join an existing room
     */
    joinRoom(roomCode, playerId) {
        const room = this.rooms.get(roomCode.toUpperCase());
        if (!room) return false;

        if (room.players.length >= 2) return false;

        room.players.push(playerId);
        return true;
    }

    /**
     * Get room by code
     */
    getRoom(roomCode) {
        if (!roomCode) return null;
        return this.rooms.get(roomCode.toUpperCase());
    }

    /**
     * Remove a room
     */
    removeRoom(roomCode) {
        if (!roomCode) return;

        const room = this.rooms.get(roomCode.toUpperCase());
        if (room && room.gameLoop) {
            clearInterval(room.gameLoop);
        }

        this.rooms.delete(roomCode.toUpperCase());
    }

    /**
     * Remove a player from their room
     */
    removePlayer(playerId) {
        for (const [code, room] of this.rooms) {
            const index = room.players.indexOf(playerId);
            if (index !== -1) {
                room.players.splice(index, 1);

                // If room is empty, remove it
                if (room.players.length === 0) {
                    this.removeRoom(code);
                }

                return code;
            }
        }
        return null;
    }

    /**
     * Get all active rooms (for debugging)
     */
    getAllRooms() {
        return Array.from(this.rooms.values()).map(room => ({
            code: room.code,
            playerCount: room.players.length,
            hasGame: !!room.gameState
        }));
    }
}
