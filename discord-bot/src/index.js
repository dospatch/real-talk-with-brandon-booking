require('dotenv').config();
const {
  Client, GatewayIntentBits, ChannelType, PermissionsBitField,
  EmbedBuilder, Events, REST, Routes
} = require('discord.js');

const { commands } = require('./commands');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const APPLICATION_URL = process.env.GUEST_APPLICATION_URL;
const BOOKING_URL = process.env.BOOKING_URL || 'https://calendar.app.google/G3jWv5C3ikmbwxXs8';
const OWNER_USER_ID = process.env.OWNER_USER_ID || '';
const BOT_VERSION = process.env.BOT_VERSION || require('../package.json').version || 'unknown';
const DEPLOY_COMMIT = (process.env.DEPLOY_COMMIT || process.env.GITHUB_SHA || '').trim();
const GITHUB_REPO = process.env.GITHUB_REPO || 'dospatch/real-talk-with-brandon-booking';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const STARTED_AT = new Date();
const BUILD_ID = DEPLOY_COMMIT ? DEPLOY_COMMIT.slice(0, 7) : 'unknown';

const ROLE_DEFS = [
  { name: 'Podcast Owner', color: 0xD4AF37, hoist: true },
  { name: 'Podcast Administrator', color: 0xE74C3C, hoist: true },
  { name: 'Podcast Team', color: 0x3498DB, hoist: true },
  { name: 'Approved Guest', color: 0x2ECC71, hoist: true },
  { name: 'Past Guest', color: 0x9B59B6, hoist: true },
  { name: 'Guest Applicant', color: 0xF1C40F, hoist: false },
  { name: 'Community Member', color: 0x95A5A6, hoist: false }
];

const CATEGORY_DEFS = [
  { name: '📌 WELCOME & INFO', channels: [
    { name: 'welcome', type: 'text', topic: 'Welcome to Real Talk with Brandon — real conversations, real stories, real people.' },
    { name: 'rules', type: 'text', topic: 'Read the community rules before participating.' },
    { name: 'announcements', type: 'text', topic: 'Official podcast and community announcements.' },
    { name: 'introductions', type: 'text', topic: 'Introduce yourself to the community.' }
  ]},
  { name: '🎙️ GUEST APPLICATIONS', channels: [
    { name: 'guest-information', type: 'text', topic: 'Learn how to apply to be a guest on Real Talk with Brandon.' },
    { name: 'guest-application', type: 'text', topic: 'Use the application link below. Do not post private application details here.' },
    { name: 'application-status', type: 'text', topic: 'General application status guidance. Individual decisions are sent privately.' }
  ]},
  { name: '📅 INTERVIEWS & GUESTS', channels: [
    { name: 'approved-guests', type: 'text', topic: 'Information for approved podcast guests.' },
    { name: 'past-guests', type: 'text', topic: 'Featured guests who have completed an interview.' },
    { name: 'podcast-episodes', type: 'text', topic: 'New episodes, clips, and episode discussions.' }
  ]},
  { name: '💬 COMMUNITY', channels: [
    { name: 'general-chat', type: 'text', topic: 'Friendly community conversation.' },
    { name: 'podcast-discussions', type: 'text', topic: 'Discuss podcast topics and episodes.' },
    { name: 'suggest-a-topic', type: 'text', topic: 'Suggest topics for future conversations.' },
    { name: 'creator-promotions', type: 'text', topic: 'Share your creative work respectfully.' },
    { name: 'Community Voice', type: 'voice' }
  ]},
  { name: '🔒 PRIVATE STAFF', private: true, channels: [
    { name: 'staff-chat', type: 'text', topic: 'Private staff coordination.' },
    { name: 'application-reviews', type: 'text', topic: 'Private application review notes. Do not share outside the authorized team.' },
    { name: 'staff-logs', type: 'text', topic: 'Bot and moderation log channel.' }
  ]}
];

function isOwnerOrAdmin(interaction) {
  if (OWNER_USER_ID && interaction.user.id === OWNER_USER_ID) return true;
  return interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator) ||
    interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild);
}

async function findRole(guild, name) {
  return guild.roles.cache.find(r => r.name === name) || null;
}
async function ensureRole(guild, def) {
  return (await findRole(guild, def.name)) ||
    guild.roles.create({ name: def.name, color: def.color, hoist: def.hoist, reason: 'Real Talk with Brandon server setup' });
}
async function privateStaffOverwrites(guild) {
  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }
  ];

  // Explicitly allow the bot's own highest role so an @everyone deny cannot
  // lock the bot out of the private category/channels.
  const botRole = guild.members.me?.roles?.highest;
  const access = [
    PermissionsBitField.Flags.ViewChannel,
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.ReadMessageHistory,
    PermissionsBitField.Flags.ManageChannels
  ];
  if (botRole && botRole.id !== guild.roles.everyone.id) {
    overwrites.push({ id: botRole.id, allow: access });
  }

  for (const name of ['Podcast Team', 'Podcast Administrator', 'Podcast Owner']) {
    const role = await findRole(guild, name);
    if (role) overwrites.push({
      id: role.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory
      ]
    });
  }
  return overwrites;
}

async function ensureCategory(guild, name, privateStaff, staffRole) {
  // Only reuse a category if Discord confirms it is accessible in this guild.
  // A stale cached channel ID can cause Discord API error 50001 (Missing Access).
  const cached = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name === name
  );

  if (cached) {
    const verified = await guild.channels.fetch(cached.id).catch(() => null);
    if (verified && verified.guildId === guild.id &&
        verified.type === ChannelType.GuildCategory) {
      return verified;
    }
    console.warn(`Ignoring inaccessible/stale category "${name}" (${cached.id}); creating a replacement.`);
  }

  const permissionOverwrites = privateStaff
    ? await privateStaffOverwrites(guild)
    : [];

  return guild.channels.create({
    name,
    type: ChannelType.GuildCategory,
    permissionOverwrites,
    reason: 'Real Talk with Brandon server setup'
  });
}

async function ensureChannel(guild, category, def, privateStaff) {
  const type = def.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
  let channel = guild.channels.cache.find(c => c.name === def.name && c.parentId === category.id && c.type === type);
  const options = { name: def.name, type, parent: category.id, topic: def.type === 'text' ? def.topic : undefined };

  if (privateStaff) {
    options.permissionOverwrites = await privateStaffOverwrites(guild);
  }

  if (!channel) channel = await guild.channels.create(options);
  // Avoid resetting permissions on existing channels; it can break access or fail
  // when the bot cannot currently view/manage that channel.
  return channel;
}
async function getLatestGithubCommit() {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'Real-Talk-with-Brandon-Bot' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/commits/${encodeURIComponent(GITHUB_BRANCH)}`, { headers, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}`);
  const data = await response.json();
  return { sha: data.sha, message: (data.commit?.message || 'No commit message').split('\n')[0], date: data.commit?.committer?.date || data.commit?.author?.date || null, url: data.html_url };
}
function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
function deploymentEmbed() {
  return new EmbedBuilder().setColor(0x3498DB).setTitle('Real Talk with Brandon — Bot Status')
    .addFields(
      { name: 'Bot', value: '🟢 Online', inline: true },
      { name: 'Version', value: String(BOT_VERSION), inline: true },
      { name: 'Running build', value: BUILD_ID, inline: true },
      { name: 'Uptime', value: formatUptime(Date.now() - STARTED_AT.getTime()), inline: true },
      { name: 'Started at', value: STARTED_AT.toISOString(), inline: true },
      { name: 'Deployment verification', value: DEPLOY_COMMIT ? 'Build commit is configured' : '⚠️ Unknown — host must set DEPLOY_COMMIT or GITHUB_SHA', inline: false }
    ).setFooter({ text: 'GitHub updates do not automatically deploy to ACLClouds.' });
}
async function logToStaff(guild, message) {
  const ch = guild.channels.cache.find(c => c.name === 'staff-logs' && c.type === ChannelType.GuildText);
  if (ch) ch.send({ content: message }).catch(() => {});
}
async function sendBooking(user) {
  const embed = new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle('You’re approved for Real Talk with Brandon!')
    .setDescription('Thank you for applying to be a guest. Your application has been approved. Use the private booking link below to choose an interview time.')
    .addFields({ name: 'Book your interview', value: BOOKING_URL })
    .setFooter({ text: 'Real Talk with Brandon • Real Conversations. Real Stories. Real People.' });
  return user.send({ embeds: [embed] });
}

client.once(Events.ClientReady, async c => {
  console.log(`Logged in as ${c.user.tag}`);
  console.log(`Deployment report: version=${BOT_VERSION}; build=${BUILD_ID}; started=${STARTED_AT.toISOString()}`);
  if (!DEPLOY_COMMIT) console.warn('Deployment version is UNKNOWN: set DEPLOY_COMMIT or GITHUB_SHA in the hosting environment.');

  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;
  const token = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN;

  if (!clientId || !guildId) {
    console.error('Missing CLIENT_ID or GUILD_ID. Slash commands were not registered.');
    return;
  }

  try {
    const rest = new REST({ version: '10' }).setToken(token);
    console.log('Registering Real Talk with Brandon slash commands...');
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log(`Successfully registered ${commands.length} slash commands.`);
    console.log('Real Talk with Brandon bot is online.');
  } catch (error) {
    console.error('Slash-command registration failed:', error);
  }
});

client.on(Events.GuildMemberAdd, async member => {
  try {
    const role = await findRole(member.guild, 'Community Member');
    if (role) await member.roles.add(role, 'Welcome role');
    const welcome = member.guild.channels.cache.find(c => c.name === 'welcome' && c.type === ChannelType.GuildText);
    if (welcome) await welcome.send(`Welcome ${member} to **Real Talk with Brandon**! Please read #rules and introduce yourself. 🎙️`);
  } catch (e) { console.error('Welcome handler error:', e); }
});

client.on(Events.MessageCreate, async message => {
  if (!message.guild || message.author.bot) return;
  const suspicious = /(discord\.com\/api\/webhooks\/|mfa\.[\w-]{20,}|(?:token|password|secret)\s*[:=]\s*\S{12,})/i;
  if (suspicious.test(message.content)) {
    await message.delete().catch(() => {});
    await message.author.send('Your message was removed because it may contain a private token, password, or credential. Never share credentials in Discord.').catch(() => {});
    await logToStaff(message.guild, `Credential-safety filter removed a message from ${message.author.tag} in #${message.channel.name}.`);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;

  try {
    if (commandName === 'bot-status') {
      return interaction.reply({ embeds: [deploymentEmbed()], ephemeral: true });
    }
    if (commandName === 'deployment-status' || commandName === 'update-check') {
      await interaction.deferReply({ ephemeral: true });
      const latest = await getLatestGithubCommit();
      const same = DEPLOY_COMMIT && DEPLOY_COMMIT.toLowerCase() === latest.sha.toLowerCase();
      const embed = new EmbedBuilder().setColor(same ? 0x2ECC71 : 0xF1C40F)
        .setTitle(commandName === 'update-check' ? 'GitHub Update Check' : 'Deployment Status')
        .addFields(
          { name: 'Currently running build', value: DEPLOY_COMMIT ? DEPLOY_COMMIT.slice(0, 12) : 'Unknown — set DEPLOY_COMMIT/GITHUB_SHA on the host', inline: false },
          { name: 'Latest GitHub commit', value: latest.sha.slice(0, 12), inline: false },
          { name: 'Latest commit message', value: latest.message.slice(0, 900), inline: false },
          { name: 'Latest commit date', value: latest.date || 'Not provided', inline: false },
          { name: 'Result', value: !DEPLOY_COMMIT ? '⚠️ GitHub is reachable, but the running build cannot be verified until the host supplies its deployed commit.' : same ? '✅ Running commit matches GitHub.' : '🔔 Running commit differs from GitHub. Updates are not installed automatically.', inline: false }
        ).setURL(latest.url);
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (commandName === 'guest-help') {
      return interaction.reply({
        ephemeral: true,
        content: `**Real Talk with Brandon — Guest Process**\n1. Submit the application: ${APPLICATION_URL}\n2. Wait for a private review decision.\n3. Only approved guests receive the booking link.\n\nPlease do not post personal application information in public channels.`
      });
    }

    if (['setup-server', 'approve-guest', 'decline-guest', 'send-booking', 'guest-complete', 'deployment-status', 'update-check'].includes(commandName) && !isOwnerOrAdmin(interaction)) {
      return interaction.reply({ content: 'Only the podcast owner or authorized server administrators can use this command.', ephemeral: true });
    }

    if (commandName === 'setup-server') {
      await interaction.deferReply({ ephemeral: true });
      const roles = {};
      for (const def of ROLE_DEFS) roles[def.name] = await ensureRole(interaction.guild, def);
      if (OWNER_USER_ID) {
        const ownerMember = await interaction.guild.members.fetch(OWNER_USER_ID).catch(() => null);
        if (ownerMember) await ownerMember.roles.add(roles['Podcast Owner']).catch(() => {});
      }
      let created = 0;
      for (const catDef of CATEGORY_DEFS) {
        const cat = await ensureCategory(interaction.guild, catDef.name, !!catDef.private, roles['Podcast Team']);
        for (const channelDef of catDef.channels) {
          await ensureChannel(interaction.guild, cat, channelDef, !!catDef.private);
          created++;
        }
      }
      const appChannel = interaction.guild.channels.cache.find(c => c.name === 'guest-application' && c.type === ChannelType.GuildText);
      if (appChannel) {
        const embed = new EmbedBuilder()
          .setColor(0x3498DB)
          .setTitle('Apply to Be a Guest')
          .setDescription('Want to share your story on **Real Talk with Brandon**? Complete the official guest application below.\n\n**Approval-first process:** Every application is reviewed before an interview is scheduled. Submitting an application does not guarantee acceptance. Application responses are private and should not be posted in this channel.')
          .addFields({ name: 'Guest application', value: APPLICATION_URL })
          .setFooter({ text: 'Real Conversations. Real Stories. Real People.' });
        await appChannel.send({ embeds: [embed] });
      }
      const welcomeChannel = interaction.guild.channels.cache.find(c => c.name === 'welcome' && c.type === ChannelType.GuildText);
      if (welcomeChannel) {
        await welcomeChannel.send({ embeds: [new EmbedBuilder().setColor(0x3498DB).setTitle('Welcome to Real Talk with Brandon!').setDescription('Real Conversations. Real Stories. Real People.\n\nPlease read #rules, introduce yourself, and be respectful of everyone in the community.')]}).catch(() => {});
      }
      await logToStaff(interaction.guild, `Server setup completed by ${interaction.user.tag}.`);
      return interaction.editReply(`Setup complete. Created or checked ${Object.keys(roles).length} roles and ${created} channels. Review the private staff category permissions and make sure the bot role is high enough to manage the roles it needs.`);
    }

    if (commandName === 'approve-guest') {
      const guest = interaction.options.getUser('guest', true);
      const notes = interaction.options.getString('notes') || 'No notes added.';
      const member = await interaction.guild.members.fetch(guest.id).catch(() => null);
      if (!member) return interaction.reply({ content: 'That user is not a member of this server. Invite them first, then approve them.', ephemeral: true });
      const approvedRole = await findRole(interaction.guild, 'Approved Guest');
      const applicantRole = await findRole(interaction.guild, 'Guest Applicant');
      if (approvedRole) await member.roles.add(approvedRole);
      if (applicantRole) await member.roles.remove(applicantRole).catch(() => {});
      try {
        await sendBooking(guest);
        await interaction.reply({ content: `Approved ${guest} and sent the booking link privately.`, ephemeral: true });
      } catch {
        await interaction.reply({ content: `Approved ${guest}, but I could not DM them. They may have DMs disabled. Use /send-booking after they enable DMs.`, ephemeral: true });
      }
      await logToStaff(interaction.guild, `Application approved for ${guest.tag} by ${interaction.user.tag}. Private review notes: ${notes}`);
      return;
    }

    if (commandName === 'decline-guest') {
      const guest = interaction.options.getUser('guest', true);
      const reason = interaction.options.getString('reason') || 'Thank you for applying to Real Talk with Brandon. We are unable to move forward with your application at this time. We appreciate your interest and wish you the best.';
      try {
        await guest.send(`Thank you for applying to **Real Talk with Brandon**. After review, we are unable to move forward with your application at this time.\n\n${reason}`);
      } catch {}
      await logToStaff(interaction.guild, `Application declined for ${guest.tag} by ${interaction.user.tag}.`);
      return interaction.reply({ content: `Recorded the decline for ${guest}. I attempted to send them a private message.`, ephemeral: true });
    }

    if (commandName === 'send-booking') {
      const guest = interaction.options.getUser('guest', true);
      const member = await interaction.guild.members.fetch(guest.id).catch(() => null);
      const approvedRole = await findRole(interaction.guild, 'Approved Guest');
      if (!member || !approvedRole || !member.roles.cache.has(approvedRole.id)) {
        return interaction.reply({ content: 'This member does not have the Approved Guest role. Approve them first.', ephemeral: true });
      }
      await sendBooking(guest);
      await logToStaff(interaction.guild, `Booking link resent privately to ${guest.tag} by ${interaction.user.tag}.`);
      return interaction.reply({ content: `Sent the booking link privately to ${guest}.`, ephemeral: true });
    }

    if (commandName === 'guest-complete') {
      const guest = interaction.options.getUser('guest', true);
      const member = await interaction.guild.members.fetch(guest.id).catch(() => null);
      if (!member) return interaction.reply({ content: 'That user is not a member of this server.', ephemeral: true });
      const pastRole = await findRole(interaction.guild, 'Past Guest');
      const approvedRole = await findRole(interaction.guild, 'Approved Guest');
      if (pastRole) await member.roles.add(pastRole);
      if (approvedRole) await member.roles.remove(approvedRole).catch(() => {});
      await logToStaff(interaction.guild, `${guest.tag} marked as a Past Guest by ${interaction.user.tag}.`);
      return interaction.reply({ content: `Marked ${guest} as a Past Guest.`, ephemeral: true });
    }
  } catch (error) {
    const discordCode = error?.code ?? error?.rawError?.code ?? 'unknown';
    const errorMessage = String(error?.message || error || 'Unknown error').slice(0, 700);
    console.error(`Command ${commandName} failed (Discord/API code: ${discordCode}): ${errorMessage}`);
    if (error?.stack) console.error(error.stack);

    let hint = 'Check the hosting console for the full error.';
    if (String(discordCode) === '50013' || /Missing Permissions/i.test(errorMessage)) {
      hint = 'Permission denied: grant the bot Manage Channels and Manage Roles, then move its highest role above the roles it creates or assigns.';
    } else if (String(discordCode) === '50001' || /Missing Access/i.test(errorMessage)) {
      hint = 'The bot cannot access a target channel or server. Confirm it is in the correct server and can view the affected channels.';
    } else if (/Unknown Guild|Unknown Server/i.test(errorMessage) || String(discordCode) === '10004') {
      hint = 'Check that GUILD_ID is the correct server ID and that this bot has joined that server.';
    } else if (/Unknown Role/i.test(errorMessage) || String(discordCode) === '10011') {
      hint = 'A target role was not found. Run /setup-server again after checking Manage Roles and role hierarchy.';
    } else if (/Invalid Form Body|Expected a string/i.test(errorMessage)) {
      hint = 'A required setting or message field may be empty. Check BOOKING_URL and GUEST_APPLICATION_URL in the hosting environment.';
    }

    const msg = `The /${commandName} command failed. Error code: ${discordCode}. ${hint}`;
    if (interaction.deferred || interaction.replied) await interaction.followUp({ content: msg, ephemeral: true }).catch(() => {});
    else await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
  }
});

const BOT_TOKEN = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('Missing DISCORD_TOKEN or DISCORD_BOT_TOKEN in environment variables.');
  process.exit(1);
}
client.login(BOT_TOKEN);
