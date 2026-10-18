const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('setup-server')
    .setDescription('Create the Real Talk with Brandon categories, channels, roles, and permissions.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('approve-guest')
    .setDescription('Approve an applicant and privately send the interview booking link.')
    .addUserOption(o => o.setName('guest').setDescription('The applicant to approve').setRequired(true))
    .addStringOption(o => o.setName('notes').setDescription('Private review notes (not sent to the guest)').setRequired(false)),

  new SlashCommandBuilder()
    .setName('decline-guest')
    .setDescription('Decline a guest application and optionally send a polite private message.')
    .addUserOption(o => o.setName('guest').setDescription('Applicant Discord user').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Optional private message to the applicant').setRequired(false)),

  new SlashCommandBuilder()
    .setName('send-booking')
    .setDescription('Privately send the booking link to an already-approved guest.')
    .addUserOption(o => o.setName('guest').setDescription('Approved guest').setRequired(true)),

  new SlashCommandBuilder()
    .setName('guest-complete')
    .setDescription('Mark a guest as a past guest after their interview.')
    .addUserOption(o => o.setName('guest').setDescription('Guest who completed an interview').setRequired(true)),

  new SlashCommandBuilder()
    .setName('bot-status')
    .setDescription('Show bot uptime, running version, and deployment verification status.'),

  new SlashCommandBuilder()
    .setName('deployment-status')
    .setDescription('Compare the running build with the latest GitHub commit.'),

  new SlashCommandBuilder()
    .setName('update-check')
    .setDescription('Check whether GitHub has a newer commit than the running build.'),

  new SlashCommandBuilder()
    .setName('guest-help')
    .setDescription('Show the guest application and approval process.')
].map(c => c.toJSON());

module.exports = { commands };
