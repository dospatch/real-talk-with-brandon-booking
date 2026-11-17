# Real Talk with Brandon — Cloudflare Workers bot

This is a separate HTTP-interactions implementation. The existing `discord-bot/` Gateway bot is intentionally preserved.

## Current feature scope
- HTTP Discord interactions with Ed25519 request verification and PING handshake.
- Guest help, application tracking, private status/history, approve/decline, booking-link DM, schedule, guest-complete, basic role setup.
- D1-backed application history and interview schedules.
- Five-minute scheduled reminder sweep for 24-hour, 1-hour, and 15-minute reminders.

Not included in this first migration: persistent Gateway presence, member-join welcome events, message-content credential filtering, full channel/category setup, and GitHub deployment status. These require Gateway events or additional implementation. The Worker will not show a persistent online presence in the member list.

## Cloudflare setup
1. Create a D1 database named `real-talk-with-brandon`.
2. Replace `database_id` in `wrangler.toml` with the ID from Cloudflare.
3. Run `npx wrangler d1 execute real-talk-with-brandon --remote --file=discord-bot-worker/schema.sql`.
4. From this directory, deploy with `npx wrangler deploy`.
5. Add secrets:
   - `npx wrangler secret put DISCORD_TOKEN`
   - `npx wrangler secret put DISCORD_PUBLIC_KEY` (Discord Developer Portal > General Information > Public Key)
6. Register slash commands from this directory using `DISCORD_TOKEN=... CLIENT_ID=... GUILD_ID=... node register-commands.mjs`.
7. In Discord Developer Portal > General Information, set Interactions Endpoint URL to `https://YOUR-WORKER.workers.dev/interactions`. Discord validates the endpoint using PING and Ed25519 signatures. This switches interactions from Gateway delivery to HTTP delivery.
8. Invite the bot with the required permissions/scopes. For role management it needs Manage Roles, and its highest role must be above the roles it assigns. For role setup it needs Manage Roles. For channel management, not included yet, it would need Manage Channels.

## Environment
Configured public values are in `wrangler.toml`: current application, booking, and Discord invite URLs. Set `OWNER_USER_ID` to the Discord owner user ID if desired.

Never commit bot tokens or public-key secrets. Do not delete or disable the old Gateway deployment until the Worker has been deployed, Discord validates the endpoint, and all required commands are tested.

## Free-plan notes
Cloudflare currently documents Workers Free at 100,000 requests/day and 10 ms CPU per invocation; D1 has daily row-read/write caps. Cron Triggers run on UTC. See Cloudflare's current limits and D1 docs before scaling.
