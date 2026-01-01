<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Impostor Game

A real-time multiplayer social deduction game.

## How to Run

You can run this game in three modes: **LAN** (local network), **Cloudflare Tunnel** (Public Internet - Recommended), or **LocalXpose**.

### Option 1: LAN Play (Recommended for Home)

Use this if all players are on the same Wi-Fi network.

1.  **Run the start script:**
    ```bash
    npm run start:lan
    ```
    *(This runs `./start.sh` which starts both the server and frontend)*
    
    Do not connect via localhost as this will not work. Use the IP address printed by the script.

2.  **Join the game:**
    -   The script will print the **Host URL** and **Player URL**.
    -   Open the **Host URL** on your computer to set up the game screen.
    -   Share the **Player URL** with your friends so they can join from their phones.

---

### Option 2: Cloudflare Tunnel (Recommended for Public Internet)

Use this if players are remote. It provides a stable URL like `https://simpleapp.qzz.io`.

**Prerequisites:**
-   Install `cloudflared` on your machine.
-   Login: `cloudflared tunnel login`
-   Create a tunnel: `cloudflared tunnel create impostor-game`
-   Route to your domain: `cloudflared tunnel route dns impostor-game simpleapp.qzz.io`

**Steps:**

1.  **Start the Game in Public Mode:**
    ```bash
    ./start.sh --public
    ```
    *(This builds the frontend and starts the unified server on port 3001)*

2.  **Start the Tunnel (in a separate terminal):**
    ```bash
    cloudflared tunnel run --url http://localhost:3001 impostor-game
    ```

---

### Option 3: Public Internet (via LocalXpose)

Use this if players are remote (not on the same Wi-Fi). You need to install the [LocalXpose CLI](https://localxpose.io/) first.

**Prerequisites:**
-   Install `loclx` and log in: `loclx account login --token <YOUR_TOKEN>`

**Steps:**

Run each of these commands in a **separate terminal window**:

1.  **Start the Game Server (Port 3001):**
    ```bash
    npm run server
    ```

2.  **Start the Frontend (Port 5173):**
    ```bash
    npm run dev:self
    ```

3.  **Start the Reverse Proxy (Port 8080):**
    ```bash
    npm run proxy
    ```

4.  **Start the Public Tunnel:**
    ```bash
    npm run tunnel:loclx
    ```

**How to Play:**
-   Copy the `https://...loclx.io` URL printed by the tunnel command.
-   Open that URL to host the game.
-   Send that same URL to your friends to join.
-   *Note: Free LocalXpose plans show a confirmation page; click "Visit" to proceed.*
