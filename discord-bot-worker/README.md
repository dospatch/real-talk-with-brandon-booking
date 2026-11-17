# Real Talk with Brandon — Cloudflare Workers bot

This is a separate HTTP-interactions implementation. The existing `discord-bot/` Gateway bot is intentionally preserved.

## Current feature scope
- HTTP Discord interactions with Ed25519 request verification and PING handshake.\n- Experimental SQLite-backed Durable Object that opens a real outbound Discord Gateway WebSocket and requests online presence.
- Guest help, application tracking, private status/history, approve/decline, booking-link DM, schedule, guest-complete, basic role setup.
- D1-backed application history and interview schedules.
- Five-minute scheduled reminder sweep for 24-hour, 1-hour, and 15-minute reminders.

The Durable Object Gateway work is an experimental prototype on a separate pull request. It requests the GUILDS intent only, so slash commands continue to use the HTTP interactions endpoint. Member-join welcome events and message-content filtering are not part of this Gateway prototype yet. Do not merge or deploy the prototype until its build and live connection have been tested.

## Cloudflare setup
1. Create a D1 database named `real-talk-with-brandon`.
2. Replace `database_id` in `wrangler.toml` with the ID from Cloudflare.
3. Run `npx wrangler d1 execute real-talk-with-brandon --remote --file=discord-bot-worker/schema.sql`.
4. From this directory, deploy with `npx wrangler deploy`.\n5. The experimental Gateway branch adds a SQLite Durable Object binding and migration. Apply the migration by deploying that branch; the existing Worker branch does not contain it.
6. Add secrets:
   - `npx wrangler secret put DISCORD_TOKEN`
   - `npx wrangler secret put DISCORD_PUBLIC_KEY` (Discord Developer Portal > General Information > Public Key)
7. Register slash commands from this directory using `DISCORD_TOKEN=... CLIENT_ID=... GUILD_ID=... node register-commands.mjs`.
8. In Discord Developer Portal > General Information, set Interactions Endpoint URL to `https://YOUR-WORKER.workers.dev/interactions`. Discord validates the endpoint using PING and Ed25519 signatures. This switches interactions from Gateway delivery to HTTP delivery.
9. Invite the bot with the required permissions/scopes. For role management it needs Manage Roles, and its highest role must be above the roles it assigns. For role setup it needs Manage Roles. For channel management, not included yet, it would need Manage Channels.

## Environment
Configured public values are in `wrangler.toml`: current application, booking, and Discord invite URLs. Set `OWNER_USER_ID` to the Discord owner user ID if desired.

Never commit bot tokens or public-key secrets. Do not delete or disable the old Gateway deployment until the Worker has been deployed, Discord validates the endpoint, and all required commands are tested.

## Free-plan notes
Cloudflare currently documents Workers Free at 100,000 requests/day and 10 ms CPU per invocation; D1 has daily row-read/write caps. Cron Triggers run on UTC. See Cloudflare's current limits and D1 docs before scaling.


## Experimental Durable Object Gateway prototype

A separate branch, `cloudflare-durable-object-gateway-poc`, adds a raw WebSocket Gateway client in `src/gateway.js`. It does not use discord.js or Node.js APIs, so it can run in the Workers runtime. The existing HTTP interactions handler remains in place for slash commands and application management.

- The Durable Object uses the bot token already stored as the `DISCORD_TOKEN` secret.
- A five-minute Cron Trigger calls the Durable Object's `/ensure` endpoint.
- The Durable Object also re-arms a ten-minute timer; Cloudflare documents pending timers and outbound WebSockets as eviction-prevention operations, with each operation capped at 15 minutes.
- The prototype identifies with the non-privileged `GUILDS` intent and requests an online presence with the activity `Real Talk with Brandon`.
- `GET /gateway/status` and `/bot-status` report the Gateway connection state.
- The current Durable Object Free allocation is 13,000 GB-seconds/day. A continuously resident 128 MiB object would use approximately 10,800 GB-seconds/day before any other Durable Object usage. This is close to the daily free allowance; monitor usage and configure account spending limits. If the Free allowance is exceeded, requests can fail rather than automatically upgrading.
- Cloudflare's outbound WebSocket eviction protection is limited to 15 minutes per operation. This prototype uses a rolling timer to request continued residency, but continuous 24/7 presence is not guaranteed until a real deployment is monitored over time.

This prototype must be treated as experimental. Do not remove the original Gateway bot source or disable the current HTTP interactions endpoint. Test the Worker deployment, confirm `GET /gateway/status` reports `gateway: online`, and verify the bot's green presence in Discord before considering it production-ready.
