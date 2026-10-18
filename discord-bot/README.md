# Real Talk with Brandon — Discord Setup Bot

Discord.js v14 bot for the podcast community and an approval-first guest process.

## Features
- `/setup-server`: creates podcast categories, channels, roles, and private staff channels.
- `/approve-guest`: assigns Approved Guest and privately sends the booking link.
- `/decline-guest`: records the decision in staff logs and attempts a private message.
- `/send-booking`: re-sends the booking link only to an already-approved member.
- `/guest-complete`: swaps Approved Guest for Past Guest and publishes a spotlight in `#past-guests`.
- `/schedule-guest`: schedule an approved guest interview using an ISO date/time with timezone and enable automatic 24-hour, 1-hour, and 15-minute DM reminders.
- `/guest-help`: shows the application and approval process.
- Welcome role/message for new members.
- Basic filter for likely exposed credentials.

## Guest links
- Application: https://docs.google.com/forms/d/e/1FAIpQLSeuyZC7ZravDoa4rPmYeFfqFOcCe_L0mT4tODZzrwGmmpoNww/viewform
- Booking: https://calendar.app.google/TbraiQqQtypEeQfx7

**Approval-first:** review form submissions first. Only approved guests should receive the booking link.

**Google Forms/Sheets limitation:** this bot does not automatically read or sync form responses. Review the response spreadsheet privately, identify/invite the applicant in Discord, and use the commands manually. Do not post the response spreadsheet publicly.

## Setup
1. Create a bot application at https://discord.com/developers/applications and add a bot user.
2. Invite it with scopes `bot` and `applications.commands`. It needs Manage Roles, Manage Channels, View Channels, Send Messages, Embed Links, Read Message History, and Manage Messages.
3. Install Node.js 20+: https://nodejs.org/
4. In this `discord-bot` folder, copy `.env.example` to `.env` and fill in the required IDs/token.
5. Run:
   ```bash
   npm install
   npm run deploy-commands
   npm start
   ```
6. Run `/setup-server` in the server. Place the bot role above roles it must assign in Server Settings → Roles. Enable Server Members Intent and Message Content Intent in the Developer Portal if needed.

## Environment variables
- `DISCORD_TOKEN`: bot token
- `CLIENT_ID`: Discord application ID
- `GUILD_ID`: Discord server ID
- `GUEST_APPLICATION_URL`: public guest form URL
- `BOOKING_URL`: booking link
- `OWNER_USER_ID`: optional Discord user ID allowed to use owner commands

## Scheduling and reminders
- Approve the guest first, then run `/schedule-guest` with the guest, a future ISO date/time **including timezone**, and an optional topic. Example: `2026-10-20T18:00:00-05:00`.
- The bot sends reminder DMs as the interview approaches. Guests must allow DMs from server members.
- Schedules are saved in `discord-bot/data/guest-schedules.json`. Make sure the host preserves this directory across restarts/redeploys; ephemeral storage can lose schedules.
- `/guest-complete` publishes a basic spotlight to `#past-guests`. Add episode links manually if you want them shown.

## Privacy and security
- Never commit `.env` or share bot tokens.
- Keep the Google response spreadsheet restricted to you and trusted reviewers.
- Review private staff channels and permissions before launching.
- The credential filter is a lightweight precaution, not a complete moderation system; configure Discord AutoMod too.
- The bot cannot DM users who have server DMs disabled.

## Folder structure
```
discord-bot/
  .env.example
  .gitignore
  package.json
  README.md
  src/
    commands.js
    deploy-commands.js
    index.js
```
