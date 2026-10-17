require('dotenv').config();
const {
  Client, GatewayIntentBits, ChannelType, PermissionsBitField,
  EmbedBuilder, Events
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const APPLICATION_URL = process.env.GUEST_APPLICATION_URL;
const BOOKING_URL = process.env.BOOKING_URL;
const OWNER_USER_ID = process.env.OWNER_USER_ID || '';

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
async function ensureCategory(guild, name, privateStaff, staffRole) {
  let category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === name);
  const overwrites = privateStaff ? [
    { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
    ...(staffRole ? [{ id: staffRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }] : [])
  ] : [];
  if (!category) category = await guild.channels.create({ name, type: ChannelType.GuildCategory, permissionOverwrites: overwrites });
  else if (privateStaff) await category.permissionOverwrites.set(overwrites);
  return category;
}
async function ensureChannel(guild, category, def, privateStaff) {
  const type = def.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
  let channel = guild.channels.cache.find(c => c.name === def.name && c.parentId === category.id && c.type === type);
  const options = { name: def.name, type, parent: category.id, topic: def.type === 'text' ? def.topic : undefined };
  if (privateStaff) {
    options.permissionOverwrites = [
      { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }
    ];
    const staff = await findRole(guild, 'Podcast Team');
    const admins = await findRole(guild, 'Podcast Administrator');
    const owner = await findRole(guild, 'Podcast Owner');
    for (const r of [staff, admins, owner]) if (r) options.permissionOverwrites.push({
      id: r.id,
      allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
    });
  }
  if (!channel) channel = await guild.channels.create(options);
  else if (privateStaff) await channel.permissionOverwrites.set(options.permissionOverwrites);
  return channel;
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

client.once(Events.ClientReady, c => {
  console.log(`Logged in as ${c.user.tag}`);
  console.log('Real Talk with Brandon bot is online.');
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
    if (commandName === 'guest-help') {
      return interaction.reply({
        ephemeral: true,
        content: `**Real Talk with Brandon — Guest Process**\n1. Submit the application: ${APPLICATION_URL}\n2. Wait for a private review decision.\n3. Only approved guests receive the booking link.\n\nPlease do not post personal application information in public channels.`
      });
    }

    if (['setup-server', 'approve-guest', 'decline-guest', 'send-booking', 'guest-complete'].includes(commandName) && !isOwnerOrAdmin(interaction)) {
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
    console.error(`Command ${commandName} failed:`, error);
    const msg = 'Something went wrong. Check the bot console logs and confirm the bot has the required permissions.';
    if (interaction.deferred || interaction.replied) await interaction.followUp({ content: msg, ephemeral: true }).catch(() => {});
    else await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
  }
});

if (!process.env.DISCORD_TOKEN) {
  console.error('Missing DISCORD_TOKEN. Copy .env.example to .env and add your bot token.');
  process.exit(1);
}
client.login(process.env.DISCORD_TOKEN);
