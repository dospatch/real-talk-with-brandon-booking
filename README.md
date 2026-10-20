🎙️ Real Talk with Brandon

Real Conversations. Real Experiences. Real Stories.

About the Project

Welcome to Real Talk with Brandon, a podcast and interview project built around sharing stories, learning from others, and creating meaningful conversations.

This project includes a Discord bot designed to help manage the behind-the-scenes work of running the Real Talk with Brandon community. From guest applications to interview scheduling, the bot helps keep the process organized so more attention can be given to the people and stories being shared.

💬 What Does the Bot Do?

The Real Talk with Brandon Discord bot helps manage the guest experience and interview workflow.

- Guest Applications: Helps organize the process of receiving and reviewing applications from people interested in appearing on the show.
- Application Decisions: Allows authorized staff to approve or decline guest applications.
- Booking Links: Sends approved guests the information they need to book an interview.
- Interview Scheduling: Helps schedule interviews and manage configured reminders.
- Interview Tracking: Allows staff to mark interviews as completed.
- Bot Status: Provides commands to check whether the bot is online.
- Update Monitoring: Helps check the running version against the latest GitHub commit.

The goal is to make guest coordination easier, improve organization, and provide a smoother experience for both guests and the team.

🎤 The Vision Behind Real Talk with Brandon

Real Talk with Brandon is about giving people an opportunity to share their experiences, talk about their journeys, and connect with others through honest conversations.

Every person has a story worth hearing. This project aims to help create an organized space where guests can prepare for interviews and where meaningful discussions can take place.

The Discord bot supports that vision by handling important organizational tasks behind the scenes.

⚙️ How It Works

The bot supports a straightforward guest workflow:

1. A prospective guest submits an application.
2. An authorized team member reviews the application.
3. The guest receives an approval or decline decision.
4. Approved guests receive the booking link.
5. An interview is scheduled.
6. Configured reminders help keep the interview on track.
7. Staff mark the interview as completed.

The level of automation depends on the bot's implementation and configuration.

🛠️ Technology

The project uses:

- JavaScript and Node.js to run the bot.
- Discord API to interact with the Discord community.
- GitHub to maintain the source code and track updates.
- ACLClouds / Pterodactyl for hosting when configured.

🚀 Project Goals

- Make podcast guest management easier.
- Keep interview scheduling organized.
- Improve communication with guests.
- Reduce repetitive administrative work.
- Maintain a reliable and manageable Discord bot.
- Continue improving the tools that support Real Talk with Brandon.

🔒 Security

The bot uses environment variables for sensitive configuration, including Discord credentials. Tokens and other secrets should remain private and must never be committed to the public repository.

❤️ The Mission

Real Talk with Brandon is more than a booking workflow. It's about people, experiences, and conversations that matter.

The bot is one part of the project, helping organize the work behind each interview so the focus can remain on what matters most: giving people a chance to tell their stories.

Welcome to Real Talk with Brandon. 🎙️

Guest application tracking

Staff can use `/track-application` to create or update a record, `/application-status` to review one record, and `/list-applications` to see records or filter by status. Records are stored in `discord-bot/data/guest-applications.json`. Approval, decline, interview scheduling, and completion commands update records automatically. External form submissions are not automatically imported unless a webhook/integration is configured. Keep the host data directory persistent across redeployments and avoid storing sensitive personal answers in staff notes.
