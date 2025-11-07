<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Quick Start (public via ngrok)

Run these four commands in separate terminals, in order:

1) Socket.IO server (3001)
```bash
npm run server
```

2) Frontend (5173), same-origin sockets
```bash
npm run dev:self
```

3) Reverse proxy (8080)
```bash
npm run proxy
```

4) Public tunnel (ngrok → 8080)
```bash
ngrok http 8080
```
Share the printed https://…ngrok-free.app URL. The lobby’s QR code and “Go to this URL” link already include `?ngrok-skip-browser-warning=true` so players won’t see the interstitial.

Alternatives for step 4:

- LocalXpose (confirmation page on free plan; cannot be bypassed)
  1) `loclx account login --token <YOUR_TOKEN>` (once)
  2) `npm run tunnel:loclx`
  Share the printed https://…loclx.io URL.

- LocalTunnel (no warning page, but can be unreliable)
  ```bash
  npm run tunnel:lt
  ```
  Share the printed https://…loca.lt URL.

Alternative: LocalXpose
1) Install the LocalXpose CLI (loclx) and create an account (free).
2) Log in with your token (from your LocalXpose dashboard), e.g.:
   `loclx account login --token <YOUR_TOKEN>`
3) Start the tunnel:
```bash
npm run tunnel:loclx
```
Share the printed https://…loclx.io (or similar) URL.

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1n7RfFcMNF_5emCyWdTSm0XogsstQnu6r

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Start the Socket.IO server (host):
   `npm run server`
4. Run the app on your LAN so phones can connect:
   `npm run dev:lan`

### Hosting a game on this machine

- Open the host setup screen: navigate to `http://<this-machine-ip>:5173/?host=1`.
- Choose settings and click "Create Game". The display will switch to the lobby showing the 4-letter code and a QR for the site.
- Other players on the same network open `http://<this-machine-ip>:5173` on their phones, enter the code and their name to join.
- When enough players have joined, click Start Game on the display.

### Play over the internet (Cloudflare Tunnel)

There are two ways to expose your game to friends on the internet:

- Quick (no account): one‑time links that change each time you start them
- Stable (recommended): fixed URLs using a Cloudflare account + your domain

#### Quick mode (no account)

1) Start the Socket.IO server

   ```bash
   npm run server
   ```

2) Expose the Socket.IO server and copy the printed URL (SOCKET_URL)

   ```bash
   npm run tunnel:socket
   ```

   Notes about the terminal output:
   - The long https://...trycloudflare.com URL is your public address; copy it.
   - Warnings like "Cannot determine default origin certificate path" and
     "ICMP proxy feature is disabled" are normal in quick mode and can be ignored.

3) Start the frontend, pointing it to your socket URL

   ```bash
   VITE_SERVER_URL=<SOCKET_URL> npm run dev
   ```

4) Expose the frontend and copy the printed URL (share this with players)

   ```bash
   npm run tunnel:frontend
   ```

Share the frontend URL with your friends. They will join there. Your display/players
will connect to the socket via `VITE_SERVER_URL` you provided.

Tip: You can run steps (2) and (4) in separate terminals concurrently.

#### Stable mode (recommended)

Gives you fixed URLs like `https://game.yourdomain.com` and `https://socket.yourdomain.com`.

Prereqs:
- Cloudflare account
- A domain added to Cloudflare (nameservers set to Cloudflare)
- cloudflared installed

Steps:
1) Log in and create a named tunnel

   ```bash
   cloudflared login                 # opens browser; pick your domain
   cloudflared tunnel create impostor-game
   ```

2) Configure hostnames

   - Copy `cloudflared/config.example.yml` to `cloudflared/config.yml`
   - Replace placeholders:
     - `YOUR_TUNNEL_NAME` → `impostor-game`
     - `YOUR_TUNNEL_ID.json` → the JSON file shown after tunnel creation
     - `game.YOUR_DOMAIN` → e.g. `game.example.com`
     - `socket.YOUR_DOMAIN` → e.g. `socket.example.com`

   The config routes:
   - `game.<your-domain>` → `http://localhost:5173` (frontend)
   - `socket.<your-domain>` → `http://localhost:3001` (Socket.IO)

3) Create DNS routes for the tunnel

   ```bash
   cloudflared tunnel route dns impostor-game game.example.com
   cloudflared tunnel route dns impostor-game socket.example.com
   ```

4) Run everything

   In terminal A (Socket.IO):
   ```bash
   npm run server
   ```

   In terminal B (frontend):
   ```bash
   VITE_SERVER_URL=https://socket.example.com npm run dev
   ```

   In terminal C (tunnel):
   ```bash
   cloudflared tunnel run impostor-game
   ```

Open `https://game.example.com` and share that URL with players.

Notes:
- If you prefer a single hostname, run a local reverse proxy (e.g., Caddy/Nginx)
  on one port that serves the frontend and proxies `/socket.io` to `localhost:3001`,
  then point the tunnel at that port. The current setup keeps things simple by
  using two hostnames.

### Single public URL (reverse proxy on localhost:8080)

Use one URL for both app and Socket.IO via a tiny local proxy.

1) Start Socket.IO server (Terminal A):

```bash
npm run server
```

2) Start frontend in same-origin mode (Terminal B):

```bash
npm run dev:self
```

3) Start the reverse proxy (Terminal C):

```bash
npm run proxy
```

4) Expose a single public URL (Terminal D):

```bash
npm run tunnel:public
```

Share the printed URL. The proxy routes `/socket.io` to `localhost:3001` and all
other paths to `localhost:5173`, so the socket connects on the same origin.
