# 🎮 Blob Blast

A cute 2-player arena shooter game with remote play support!

![Blob Blast](client/public/blob.svg)

## Features

- 🟣🔵 **Cute blob characters** with expressive faces
- 🎯 **WASD + Mouse controls** - Move with keyboard, aim and shoot with mouse
- 🌐 **Remote multiplayer** - Play with friends using room codes
- ⚡ **Fast-paced action** - First to 5 points wins!
- 🏰 **Arena with obstacles** - Use cover strategically

## Quick Start

### Run Locally

1. **Start the server:**
   ```bash
   cd server
   npm install
   npm run dev
   ```

2. **Start the client (in another terminal):**
   ```bash
   cd client
   npm install
   npm run dev
   ```

3. **Play:**
   - Open http://localhost:5173 in two browser windows
   - Create a room in one window
   - Join with the room code in the other window
   - Battle!

## Controls

| Action | Key/Mouse |
|--------|-----------|
| Move Up | W or ↑ |
| Move Down | S or ↓ |
| Move Left | A or ← |
| Move Right | D or → |
| Aim | Mouse cursor |
| Shoot | Left click |

## Deployment

### Frontend → Vercel

1. Create a Vercel account at [vercel.com](https://vercel.com)
2. Connect your GitHub repo or use the CLI:
   ```bash
   cd client
   npm i -g vercel
   vercel
   ```
3. Set environment variable: `VITE_SERVER_URL` = your Railway backend URL

### Backend → Railway

1. Create a Railway account at [railway.app](https://railway.app)
2. Create new project and connect your repo
3. Set the root directory to `server`
4. Set environment variable: `CLIENT_URL` = your Vercel frontend URL

## Tech Stack

- **Frontend:** Vite + Vanilla JavaScript + HTML5 Canvas
- **Backend:** Node.js + Express + Socket.io
- **Hosting:** Vercel (frontend) + Railway (backend)

## License

MIT
