# Impostor Prompt

A real-time party game: players answer prompts on their phones while a shared screen reveals answers, runs voting, and displays scores. One player receives a different prompt and tries to avoid detection.

The public address is **https://simpleapp.qzz.io**. The game runs on your computer and Cloudflare forwards this domain to it.

## Start the game

Install Node.js **22.9 or newer** (Node 24 is used for verification). In a terminal in this repository:

```powershell
npm ci
npm run setup:tunnel
npm run host
```

After the one-time token setup linked below, this builds the frontend, starts one local server at **http://127.0.0.1:8080**, and connects it to the public domain. Leave the terminal open while playing. Press **Ctrl+C** to stop it. Dependencies and the connector only need installing once.

Your existing Cloudflare tunnel runs on this computer and forwards **simpleapp.qzz.io → http://127.0.0.1:8080**. Follow [the step-by-step token setup](docs/hosting.md#one-time-cloudflare-account-setup) once. The scripts create the forwarding rule locally, so you do not need to find a route editor in the Cloudflare dashboard. Then use `npm run host` or double-click `scripts/start-game.cmd` whenever you want to host the game.

Once the tunnel is connected:

1. Open **https://simpleapp.qzz.io/host** on the shared screen and create a game.
2. Players open **https://simpleapp.qzz.io** or scan the QR code, then enter the room code and their name.
3. Start when enough players have joined. Players answer, discuss, and vote at their own pace, with no time limits. The host starts the next round after everyone has read the results.

You can check the host/player pages locally at `http://127.0.0.1:8080/host` and `http://127.0.0.1:8080`. Use the public host URL when playing with phones so the QR code points to the public domain.

## Configuration

Defaults work without a configuration file. To set a different local port or run the tunnel with its existing token, copy `.env.example` to `.env`:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

If you change `PORT`, restart hosting; the scripts update the local forwarding rule automatically. The tunnel helper reads `CLOUDFLARE_TUNNEL_TOKEN` from `.env`; keep tokens private. Game settings are entered on the host screen.

## Development and checks

To explore the design without gathering players, open **http://127.0.0.1:8080/?preview=1** while the local server is running (or `http://127.0.0.1:5173/?preview=1` in development). Watch friends around the table, large central answer cards collect into a spread, and the same cards carry voting, the impostor reveal, voter names, scores, and final placements. Sample players answer automatically; **Everyone votes** simulates voting. You can also switch moments, try different group sizes, and inspect long answers. See [the design notes](docs/design.md) for the visual direction and pacing.

```powershell
npm run dev
```

This starts Vite at **http://127.0.0.1:5173** and the game server at **http://127.0.0.1:8080** together. Open `http://127.0.0.1:5173/host` to develop the host view. Frontend edits update immediately; backend edits restart the development server and clear its in-memory rooms. Stop both with **Ctrl+C**. Stop production before starting development, since both use the same backend port.

Run the complete verification with **Google Chrome installed**:

```powershell
npm run check
```

| Command                    | Purpose                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------- |
| `npm start`                | Build and run the local game without the Cloudflare connector                      |
| `npm run server`           | Run an already built game                                                          |
| `npm run host`             | Build and run the game and Cloudflare connector together                           |
| `npm run check:public`     | Verify the public domain, assets, WebSockets, and a multiplayer round              |
| `npm run setup:tunnel`     | Download and verify the official Windows Cloudflare connector                      |
| `npm run configure:tunnel` | Save the existing tunnel token using hidden input on Windows                       |
| `npm run tunnel`           | Run the existing Cloudflare tunnel using its token                                 |
| `npm run dev`              | Run the local development frontend and backend                                     |
| `npm run build`            | Check TypeScript and build `dist/`                                                 |
| `npm run typecheck`        | Check strict TypeScript types                                                      |
| `npm test`                 | Check gameplay regression cases and HTTP/Socket.IO behavior                        |
| `npm run test:e2e`         | Play two rounds with a host and three browser players; requires a build and Chrome |
| `npm run test:e2e:public`  | Run the same browser checks through the public domain while hosting is running     |
| `npm run format`           | Format source and documentation                                                    |
| `npm run format:check`     | Check formatting                                                                   |
| `npm run check`            | Run formatting, build, server/game tests, and browser tests                        |

The local browser tests and `npm run check` own port 8080; stop any manually running game or development server before running them. Keep hosting running for `npm run test:e2e:public`. Screenshots and failure traces are written under `test-results/` and are ignored by Git.

## Project structure

- [`src/`](src/): React browser app, display/player components, connection hook, and styles.
- [`server/`](server/): HTTP hosting, Socket.IO handlers, rooms, game phases, prompts, and scoring.
- [`shared/`](shared/): Game types, event contracts, and the original prompt dataset.
- [`scripts/`](scripts/): Development and Cloudflare startup helpers.
- [`tests/`](tests/): Game, server, and multiplayer browser checks.

See [the architecture guide](docs/architecture.md) for module responsibilities, unchanged game rules, and existing prototype limitations.

Rooms and scores are stored in memory. Keep your computer awake and both the game and Cloudflare connector running; restarting the server clears active games.

If a phone briefly loses its connection, it keeps its place and reconnects automatically. Refreshing the same tab also restores the player, prompt, submitted answer, vote, and score. Keep the original tab open: closing it or clearing browser storage loses its recovery token. The game continues to wait for disconnected players to return. Hosting logs report disconnect reasons and successful session recovery.
