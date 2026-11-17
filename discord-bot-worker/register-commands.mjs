import { readFile } from "node:fs/promises";
const token = process.env.DISCORD_TOKEN;
const appId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
if (!token || !appId || !guildId) throw new Error("Set DISCORD_TOKEN, CLIENT_ID, and GUILD_ID before registering commands.");
const commands = JSON.parse(await readFile(new URL("./commands.json", import.meta.url), "utf8"));
const response = await fetch(`https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`, {
  method: "PUT",
  headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify(commands)
});
const result = await response.text();
if (!response.ok) throw new Error(`Discord command registration failed: ${response.status} ${result}`);
console.log(`Registered ${commands.length} Real Talk commands.`);
