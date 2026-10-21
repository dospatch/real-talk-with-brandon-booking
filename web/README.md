# Real Talk with Brandon — Guest Application Portal

This is a separate Next.js app inside `web/`. It provides a public guest application form, a password-protected staff dashboard, persistent PostgreSQL storage, Discord webhook notifications, and applicant email notifications through Resend.

## Deploy without interrupting the Discord bot

Keep the repository root configured for the existing ACLClouds/Pterodactyl bot. Create a **separate Vercel project** connected to this same GitHub repository and set its **Root Directory** to `web`. This keeps the website deployment independent from the bot's root `index.js`.

## Environment variables

Copy `.env.example` to your deployment's environment settings and configure:

- `DATABASE_URL`: a PostgreSQL connection string from your database provider (Neon is supported).
- `ADMIN_PASSWORD`: a strong password for the staff dashboard. Everyone sharing this password can review and update applications, so only give it to trusted staff.
- `SESSION_SECRET`: a different, long random secret used to sign staff sessions.
- `DISCORD_WEBHOOK_URL`: a webhook URL for a private staff-only Discord channel. Keep it secret.
- `RESEND_API_KEY`: Resend API key for email delivery.
- `EMAIL_FROM`: a sender address on a domain verified with Resend.
- `NEXT_PUBLIC_SITE_URL`: optional public site URL used in Discord notifications.

The database table is created automatically when the API is first used. No email is sent during build. If the email or Discord provider is not configured, the application can still be saved but those notifications won't be delivered; configure and test both before public launch.

## Local development

From this directory run `npm install`, set the environment variables, then `npm run dev`. Deploy using Node.js 20 or newer.

## Important

- Never put database credentials, the staff password, the session secret, Resend key, or Discord webhook in client-side code.
- The dashboard is password protected with an HTTP-only, SameSite cookie; use a strong unique password and keep deployment access restricted.
- The current first version uses a shared staff password rather than individual staff accounts/roles.
- The website stores its own authoritative application records in PostgreSQL. It notifies Discord using a webhook; it does not modify the bot's local JSON files, since those files are separate and are not a safe shared database for serverless website requests.
