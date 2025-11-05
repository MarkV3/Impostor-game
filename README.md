<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

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
