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

4) Public tunnel (LocalXpose → 8080)
```bash
loclx account login --token <YOUR_TOKEN>   # once
npm run tunnel:loclx
```
Share the printed https://…loclx.io URL. Note: LocalXpose shows a confirmation page on the free plan; click “Visit” to proceed.

Alternative: LocalXpose
1) Install the LocalXpose CLI (loclx) and create an account (free).
2) Log in with your token (from your LocalXpose dashboard), e.g.:
   `loclx account login --token <YOUR_TOKEN>`
3) Start the tunnel:
```bash
npm run tunnel:loclx
```
Share the printed https://…loclx.io (or similar) URL.

## LAN-only (optional)

- Host setup: `http://<this-machine-ip>:5173/?host=1`
- Players: `http://<this-machine-ip>:5173`

### Notes
- Keep the three local processes (server, dev, proxy) running during play.
- LocalXpose free plan shows a confirmation page; click “Visit” to continue.
