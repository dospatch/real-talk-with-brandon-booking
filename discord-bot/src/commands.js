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
    .setName('schedule-guest')
    .setDescription('Schedule an approved guest interview and send automatic reminders.')
    .addUserOption(o => o.setName('guest').setDescription('Approved guest').setRequired(true))
    .addStringOption(o => o.setName('datetime').setDescription('ISO date/time with timezone, e.g. 2026-10-20T18:00:00-05:00').setRequired(true))
    .addStringOption(o => o.setName('topic').setDescription('Interview topic (optional)').setRequired(false)),

  new SlashCommandBuilder()
    .setName('track-application')
    .setDescription('Create or update a guest application record (staff only).')
    .addUserOption(o => o.setName('guest').setDescription('Applicant Discord user').setRequired(true))
    .addStringOption(o => o.setName('status').setDescription('Current application status').setRequired(true).addChoices(
      { name: 'Submitted', value: 'submitted' }, { name: 'Under review', value: 'under_review' }, { name: 'Approved', value: 'approved' },
      { name: 'Declined', value: 'declined' }, { name: 'Interview scheduled', value: 'interview_scheduled' }, { name: 'Completed', value: 'completed' }))
    .addStringOption(o => o.setName('notes').setDescription('Private staff notes (optional)').setMaxLength(1000).setRequired(false)),

  new SlashCommandBuilder()
    .setName('application-status')
    .setDescription('View one guest application record privately (staff only).')
    .addUserOption(o => o.setName('guest').setDescription('Applicant Discord user').setRequired(true)),

  new SlashCommandBuilder()
    .setName('list-applications')
    .setDescription('List tracked guest applications privately (staff only).')
    .addStringOption(o => o.setName('status').setDescription('Filter by status (default: all)').setRequired(false).addChoices(
      { name: 'All', value: 'all' }, { name: 'Submitted', value: 'submitted' }, { name: 'Under review', value: 'under_review' },
      { name: 'Approved', value: 'approved' }, { name: 'Declined', value: 'declined' }, { name: 'Interview scheduled', value: 'interview_scheduled' }, { name: 'Completed', value: 'completed' })),

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
