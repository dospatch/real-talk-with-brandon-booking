# Real Talk with Brandon

Discord bot and booking workflow for the **Real Talk with Brandon** community. The bot supports guest help, application review, booking links, interview scheduling, reminders, and deployment checks.

## ACLClouds / Pterodactyl deployment

The repository root includes `index.js` and `package.json` so a Node.js hosting panel configured with `MAIN_FILE=index.js` can start the bot from the repository root. The main bot implementation remains under `discord-bot/src/`.

### 1. Deploy the repository

Upload or deploy the repository contents into `/home/container/`, preserving the `discord-bot/` folder.

Confirm these files exist:

- `/home/container/index.js`
- `/home/container/package.json`
- `/home/container/discord-bot/src/index.js`
- `/home/container/discord-bot/src/commands.js`
- `/home/container/discord-bot/package.json`

### 2. Configure Startup

In the ACLClouds / Pterodactyl Startup settings, set:

- `MAIN_FILE=index.js`

Use the repository root entry point. It loads `discord-bot/src/index.js`.

If the panel reports `main file 'index.js' not found`, check the **Files** page and make sure the root `index.js` and `package.json` are uploaded to the exact directory the server starts in.

### 3. Configure environment variables

Set the following values in the hosting panel or in a private root `.env` file:

- `DISCORD_TOKEN` (or `DISCORD_BOT_TOKEN`)
- `CLIENT_ID`
- `GUILD_ID`
- `OWNER_USER_ID`
- `GUEST_APPLICATION_URL`
- `BOOKING_URL`

The deployment-status check can also use `GITHUB_TOKEN` to read the latest commit from the private GitHub repository. Use a narrowly scoped token with read-only repository contents access where supported.

**Security:** Never commit or publish `.env`, Discord bot tokens, GitHub tokens, or other credentials. Keep secrets in the hosting panel or a private local file. If a token is exposed, revoke it and create a replacement.

### 4. Start and verify

Start or restart the server from the hosting panel and check the console for successful bot login and command registration. In Discord, run:

- `/bot-status` — check whether the bot is online.
- `/deployment-status` — compare the running build with the latest GitHub commit.
- `/update-check` — check for a newer repository commit.

A matching commit means the running build matches the latest commit reported by GitHub; it does not by itself prove every feature has been tested.

If the hosting panel does not automatically deploy new commits, upload or deploy the latest repository contents and restart the server after merging changes into `main`.

## Required environment variables

| Variable | Purpose |
| --- | --- |
| `DISCORD_TOKEN` or `DISCORD_BOT_TOKEN` | Authenticates the Discord bot |
| `CLIENT_ID` | Discord application ID |
| `GUILD_ID` | Discord server ID for guild commands |
| `OWNER_USER_ID` | Bot owner's Discord user ID |
| `GUEST_APPLICATION_URL` | Guest application form URL |
| `BOOKING_URL` | Booking page URL |
| `GITHUB_TOKEN` | Optional; read-only GitHub API access for deployment checks |

Keep values private. Do not paste token values into issues, chat messages, screenshots, or commits.

## Local run

From the repository root, install dependencies and start the bot:

```bash
npm install
npm start
```

Use the required environment variables from a private `.env` file or your shell environment before starting locally.

## Bot commands

### Guest workflow

- `/setup-server` — set up the server's bot workflow.
- `/guest-help` — show guests how to use the application and booking process.
- `/approve-guest` — approve a guest application.
- `/decline-guest` — decline a guest application.
- `/send-booking` — send the booking link to an approved guest.
- `/schedule-guest` — schedule an interview and trigger the configured reminders.
- `/guest-complete` — mark a guest interview as completed.

### Bot and deployment checks

- `/bot-status` — check bot status.
- `/deployment-status` — view the running build and latest GitHub commit.
- `/update-check` — check whether a newer commit is available.

Administrative commands may be restricted to the bot owner or authorized staff. Use the permissions configured in the bot and Discord server.

## Interview scheduling notes

- Provide a valid ISO 8601 date/time with a timezone offset when scheduling, for example `2026-10-20T18:00:00-05:00`.
- The bot prevents a second active scheduled interview for the same guest in the same server.
- Scheduled reminders depend on the bot staying online and the schedule data remaining available on the host. Keep the bot's data directory persistent when redeploying or replacing files.
