# Play online with Render

Render runs the game on a remote server. Once deployment is live, your computer can be switched off. Players use the same HTTPS address for the website and multiplayer connection.

## First deployment

1. Create a [Render account](https://dashboard.render.com/register), preferably using your GitHub account. Use the free Hobby workspace.
2. Make sure the hosting changes, including `render.yaml`, have been pushed to the `main` branch of [MarkV3/Impostor-game](https://github.com/MarkV3/Impostor-game).
3. In the [Render dashboard](https://dashboard.render.com), choose **New → Blueprint**. Connect GitHub and grant access to this repository. A private repository is supported; it does not need to become public.
4. Select **Impostor-game**, use branch **main**, and name the Blueprint **impostor-game**. Render reads `render.yaml` from the repository root.
5. Review the proposed service: **impostor-prompt**, **Node**, **Frankfurt**, and **Free**. Deploy the Blueprint. No database or disk is needed. Do not select a paid instance or add a payment method to keep this setup strictly free.
6. Wait until the service shows **Live**, then open the HTTPS address shown on its page. The address will end in `.onrender.com`; use the actual assigned address rather than assuming a particular subdomain.
7. Open that address followed by `/host` to create a game. Players open the address without `/host`, or scan the QR code. The QR code automatically uses the address you opened.

No Cloudflare token, local connector, or `.env` upload is required. Render supplies `PORT` and `RENDER_EXTERNAL_URL`; the Blueprint sets `HOST=0.0.0.0` so Render can reach the server. `.node-version` selects the tested Node version.

If you prefer **New → Web Service**, connect the same repository and enter these settings manually:

| Setting              | Value                                   |
| -------------------- | --------------------------------------- |
| Branch               | `main`                                  |
| Language / runtime   | Node                                    |
| Region               | Frankfurt                               |
| Instance type        | **Free**                                |
| Build command        | `npm ci --include=dev && npm run build` |
| Start command        | `npm run server`                        |
| Health check path    | `/health`                               |
| Environment variable | `HOST=0.0.0.0`                          |
| Environment variable | `NODE_ENV=production`                   |

Leave the root directory empty. Use **Web Service**, because a Static Site cannot run the game server. The build explicitly installs development dependencies so TypeScript and Vite remain available when `NODE_ENV=production`.

## Check that it works

Open the service's `/health` address. It should return `{"ok":true,"frontendReady":true}`. Create a room at `/host`, join with a phone on mobile data, and play a round. Once this works, stop the local game and Cloudflare connector and try the Render address again.

You can also run the existing multiplayer check from PowerShell, replacing the example address with the assigned service address:

```powershell
$env:PUBLIC_URL = 'https://YOUR-SERVICE.onrender.com'
npm.cmd run check:public
```

Open the website first and let it finish waking up before running the check. For the full Chrome browser check, with Chrome installed:

```powershell
npm.cmd run test:e2e:public
```

Clear the override afterward with `Remove-Item Env:PUBLIC_URL` if you want to check the old Cloudflare address again.

## Updating and managing the game

After testing a change locally, commit it and push it to `main`. Render automatically builds and deploys the updated game. Watch progress in the service's **Events** page; use **Logs** to investigate a failure. For a manual retry, choose **Manual Deploy → Deploy latest commit**.

Deploy updates between games: rooms, session tokens, and scores live in server memory, so a successful deployment or server restart clears active games. A failed build does not publish the new code.

Render's free service sleeps after 15 minutes without incoming traffic and usually takes about one minute to wake up. Open the game while gathering players. Normal multiplayer traffic keeps the service active, but Render may restart a free instance at any time. A single service receives a share of the workspace's 750 free instance hours each month; bandwidth and build limits also apply. With no payment method, usage that would incur charges disables services instead of billing you.

## Your existing domain

Start with the assigned `.onrender.com` address. `simpleapp.qzz.io` still points to the old Cloudflare tunnel until you change its DNS routing. If you later attach it as a Render custom domain, follow Render's DNS instructions and replace the tunnel route. Opening `/host` through either working domain automatically makes the QR code use that domain.

## Troubleshooting

| Symptom                                 | What to check                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------- |
| Deploy reports no open port             | Use `npm run server`, set `HOST=0.0.0.0`, and let Render supply `PORT`.         |
| Build cannot find TypeScript or Vite    | Use `npm ci --include=dev && npm run build`.                                    |
| Frontend build missing                  | Check the build logs and build command.                                         |
| Old domain fails when the laptop is off | Use the assigned Render address; the old domain still uses the laptop tunnel.   |
| First page takes a while to load        | Allow about a minute for the free service to wake up.                           |
| Game disappeared                        | A deployment, restart, or sleep cleared its in-memory rooms. Create a new room. |

These settings follow Render's [Web Services](https://render.com/docs/web-services), [Blueprint reference](https://render.com/docs/blueprint-spec), [Node version](https://render.com/docs/node-version), [free service limits](https://render.com/docs/free), and [billing FAQ](https://render.com/docs/faq).
