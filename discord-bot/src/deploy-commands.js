require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { commands } = require('./commands');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN;
const { CLIENT_ID, GUILD_ID } = process.env;
if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('Missing Discord token (DISCORD_TOKEN or DISCORD_BOT_TOKEN), CLIENT_ID, or GUILD_ID in environment variables.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
(async () => {
  try {
    console.log(`Registering ${commands.length} slash commands...`);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('Commands registered successfully for this server.');
  } catch (error) {
    console.error('Failed to register commands:', error);
    process.exitCode = 1;
  }
})();
