# Poker practice on Android

The existing Render Node service serves both apps. Keep the normal build command, start command, and root directory settings. No new service or paid feature is needed.

## Open the trainer

1. Open the working HTTPS address of your deployed site in Chrome on Android.
2. Add `/poker/` to the end of that address, or choose **All apps → Hold’em Practice** from the game’s join/host setup screen.
3. Wait for **Offline ready** near the top. The first setup needs a connection and enough browser storage.
4. Tap **Install trainer**. Accept Chrome’s installation prompt. If instructions appear instead, use Chrome’s **⋮ → Add to Home screen → Install** when offered. If you opened the link inside another app, first choose **Open in Chrome**.
5. Find **Poker Practice** on your home screen and open it.
6. To check offline use: open the installed trainer once, close it, turn on airplane mode, and open it again. Turn airplane mode off afterward.

If Chrome offers only a shortcut, it still opens the website. Offline practice is supplied separately by the trainer’s cached files. Installation does not make the multiplayer party game work offline.

If offline setup fails, reconnect and reload. If this repeats, confirm you are using HTTPS and that Chrome allows site storage. Browsers can remove cached files under storage pressure; reconnect to prepare them again.

## Progress and updates

- Practice results and review mistakes are saved on this device in this browser. A different device, a different hostname, or clearing site storage has separate or empty progress.
- Opening the trainer online fetches the latest HTML and saves it for offline use. If the server is slow to wake up, a previously cached trainer opens after a short wait while the refresh continues in the background. Offline visits use the most recently saved version.
- If the offline worker itself changes, an **Update available · reload** button lets you activate it between questions. It does not force a reload during practice.
- `/apps/`, `/`, `/host`, and multiplayer connections require a connection. The poker worker does not cache them.

## Publishing changes from a phone

If a prepared pull request has not been merged:

1. Open its GitHub link and sign in to your account.
2. Read the summary, then open the **Conversation** tab and scroll to the merge area.
3. If GitHub permits the merge, tap **Merge pull request** (or **Squash and merge**), then **Confirm**. If a check fails or merging is blocked, share the displayed message instead of changing repository rules.
4. Open [Render’s dashboard](https://dashboard.render.com), choose your **impostor-prompt** service, and open **Events**.
5. Wait for the deployment for that commit to show **Live**, then open the site’s `/poker/` address. An ordinary deployment restarts the party-game server and clears in-memory rooms, so publish between multiplayer games.

If Render does not start a deployment after a merge, open **Manual Deploy → Deploy latest commit** on that service. The repository already includes the required build/start configuration; no terminal or laptop is required.

## Trainer scope

The trainer follows the conservative beginner playbook in this conversation, not a poker solver. It covers 137 designed lesson families, all 169 pre-flop starting classes through the opening groups, completed hands, raises, shared-card traps, and draw prices. It does not enumerate every possible deal or betting history. Opponent reads and clean-outs assumptions are part of the questions. Normal setup: 4–9 players, fixed blinds, approximately 75–150 BB. No short-stack tournament strategy, real-money betting, or automatic cross-device progress sync.
