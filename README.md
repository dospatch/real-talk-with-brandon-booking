# Real Talk with Brandon

Discord bot and booking workflow for the Real Talk with Brandon community.

## ACLClouds / Pterodactyl deployment

The repository root now includes `index.js` and `package.json` so a Node.js panel configured with `MAIN_FILE=index.js` can start the bot from the repository root. The actual bot code remains under `discord-bot/src/`.

1. Upload or deploy the repository contents into `/home/container/`, preserving the `discord-bot/` folder.
2. Ensure these files exist:
   - `/home/container/index.js`
   - `/home/container/package.json`
   - `/home/container/discord-bot/src/index.js`
   - `/home/container/discord-bot/src/commands.js`
   - `/home/container/discord-bot/package.json`
3. In Startup, set `MAIN_FILE` to exactly `index.js`.
4. Keep the existing environment variables in the hosting panel or `.env`. Never publish `.env` or your Discord token.
5. Start the server. The panel should run `/home/container/index.js`, which loads `discord-bot/src/index.js`.
6. If the panel still says `main file 'index.js' not found`, the root files have not been uploaded to the server directory being started. Check the Files page and upload the new root `index.js` and `package.json`.

## Required environment variables

- `DISCORD_TOKEN` (or `DISCORD_BOT_TOKEN`)
- `CLIENT_ID`
- `GUILD_ID`
- `OWNER_USER_ID`
- `GUEST_APPLICATION_URL`
- `BOOKING_URL`

Set these in the hosting panel's environment variables or in a private `.env` file. Do not commit secrets to GitHub.

## Local run

From the repository root:

```bash
npm install
npm start
```

## Bot commands

- `/setup-server`
- `/guest-help`
- `/approve-guest`
- `/decline-guest`
- `/send-booking`
- `/guest-complete`
