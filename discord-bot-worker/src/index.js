export { DiscordGateway } from "./gateway.js";
const API = "https://discord.com/api/v10";
const STATUS_LABELS = {
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  declined: "Declined",
  interview_scheduled: "Interview scheduled",
  completed: "Completed"
};
const STAFF_COMMANDS = new Set([
  "setup-server", "approve-guest", "decline-guest", "send-booking",
  "guest-complete", "schedule-guest", "track-application",
  "application-status", "list-applications", "bot-status"
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}
function hexToBytes(hex) {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2) return new Uint8Array();
  return new Uint8Array(hex.match(/.{2}/g).map(x => parseInt(x, 16)));
}
async function verifyDiscordRequest(request, body, publicKey) {
  const signature = request.headers.get("X-Signature-Ed25519");
  const timestamp = request.headers.get("X-Signature-Timestamp");
  if (!signature || !timestamp || !publicKey) return false;
  try {
    const key = await crypto.subtle.importKey(
      "raw", hexToBytes(publicKey), { name: "Ed25519" }, false, ["verify"]
    );
    return await crypto.subtle.verify(
      { name: "Ed25519" }, key, hexToBytes(signature),
      new TextEncoder().encode(timestamp + body)
    );
  } catch {
    return false;
  }
}
async function discord(env, path, options = {}) {
  const response = await fetch(API + path, {
    ...options,
    headers: {
      Authorization: `Bot ${env.DISCORD_TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  if (!response.ok) throw new Error(`Discord API ${response.status}: ${JSON.stringify(data).slice(0, 500)}`);
  return data;
}
async function replyFollowup(env, interaction, content, embeds) {
  const body = { content, allowed_mentions: { parse: [] } };
  if (embeds?.length) body.embeds = embeds;
  await discord(env, `/webhooks/${interaction.application_id}/${interaction.token}`, {
    method: "POST", body: JSON.stringify(body)
  });
}
function option(interaction, name) {
  return (interaction.data?.options || []).find(x => x.name === name)?.value ?? null;
}
function isStaff(interaction, env) {
  if (env.OWNER_USER_ID && interaction.member?.user?.id === env.OWNER_USER_ID) return true;
  const permissions = BigInt(interaction.member?.permissions || "0");
  const ADMINISTRATOR = 1n << 3n;
  const MANAGE_GUILD = 1n << 5n;
  return (permissions & ADMINISTRATOR) !== 0n || (permissions & MANAGE_GUILD) !== 0n;
}
async function getUser(env, userId) {
  return discord(env, `/users/${userId}`);
}
async function sendDM(env, userId, content, embeds) {
  const channel = await discord(env, "/users/@me/channels", {
    method: "POST", body: JSON.stringify({ recipient_id: userId })
  });
  return discord(env, `/channels/${channel.id}/messages`, {
    method: "POST",
    body: JSON.stringify({ content, embeds, allowed_mentions: { parse: [] } })
  });
}
async function getApplication(env, guildId, userId) {
  return env.DB.prepare(
    "SELECT * FROM applications WHERE guild_id = ? AND user_id = ?"
  ).bind(guildId, userId).first();
}
async function saveApplication(env, guildId, userId, username, status, notes, actorId) {
  const now = new Date().toISOString();
  const id = guildId + "-" + userId;
  await env.DB.prepare(`
    INSERT INTO applications (id,guild_id,user_id,username,status,notes,created_at,updated_at,updated_by)
    VALUES (?,?,?,?,?,?,?,?,?)
    ON CONFLICT(guild_id,user_id) DO UPDATE SET
      username=excluded.username,status=excluded.status,notes=excluded.notes,
      updated_at=excluded.updated_at,updated_by=excluded.updated_by
  `).bind(id,guildId,userId,username,status,notes || null,now,now,actorId || null).run();
  await env.DB.prepare(
    "INSERT INTO application_history (application_id,status,notes,changed_by,created_at) VALUES (?,?,?,?,?)"
  ).bind(id,status,notes || null,actorId || null,now).run();
  return { id, status, updatedAt: now };
}
async function findRole(env, guildId, name) {
  const roles = await discord(env, `/guilds/${guildId}/roles`);
  return roles.find(r => r.name === name) || null;
}
async function ensureRole(env, guildId, name, color) {
  const found = await findRole(env, guildId, name);
  if (found) return found;
  return discord(env, `/guilds/${guildId}/roles`, {
    method: "POST", body: JSON.stringify({ name, color, hoist: true, mentionable: false })
  });
}
async function assignRole(env, guildId, userId, roleId, add = true) {
  return discord(env, `/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
    method: add ? "PUT" : "DELETE", body: add ? "{}" : undefined
  });
}
async function logStaff(env, guildId, message) {
  try {
    const channels = await discord(env, `/guilds/${guildId}/channels`);
    const channel = channels.find(c => c.name === "staff-logs" && c.type === 0);
    if (channel) await discord(env, `/channels/${channel.id}/messages`, {
      method: "POST", body: JSON.stringify({ content: message, allowed_mentions: { parse: [] } })
    });
  } catch (e) { console.log("Staff log unavailable:", e.message); }
}
async function gatewaySnapshot(env) {
  try {
    const id = env.GATEWAY.idFromName("real-talk-with-brandon");
    const response = await env.GATEWAY.get(id).fetch("https://gateway/status");
    return await response.json();
  } catch (error) {
    return { connected: false, gateway: "unavailable", lastError: String(error?.message || error) };
  }
}
async function processCommand(interaction, env) {
  const name = interaction.data.name;
  const guildId = interaction.guild_id;
  const actor = interaction.member?.user?.id || interaction.user?.id;
  const guestId = option(interaction, "guest");
  const notes = option(interaction, "notes") || "";
  if (STAFF_COMMANDS.has(name) && !isStaff(interaction, env)) {
    await replyFollowup(env, interaction, "Only the podcast owner or authorized server administrators can use this command.");
    return;
  }
  if (name === "guest-help") {
    await replyFollowup(env, interaction,
      `**Real Talk with Brandon — Guest Process**\n1. Apply: ${env.APPLICATION_URL}\n2. Wait for a private review decision.\n3. Approved guests receive the booking link.\n\nJoin the community: ${env.DISCORD_INVITE_URL}\nPlease do not post personal application information in public channels.`);
    return;
  }
  if (name === "bot-status") {
    const gateway = await gatewaySnapshot(env);
    const presence = gateway.connected ? "🟢 Online" : "🟠 Connecting / reconnecting";
    await replyFollowup(env, interaction,
      `**Real Talk with Brandon Bot**\nGateway presence: **${presence}**\nHTTP interactions: **Active**\nLast Gateway ready: ${gateway.lastReadyAt || "Not connected yet"}` +
      (gateway.lastError ? `\nLast error: ${String(gateway.lastError).slice(0,250)}` : ""));
    return;
  }
  if (name === "setup-server") {
    const definitions = [
      ["Podcast Owner", 0xD4AF37], ["Podcast Administrator", 0xE74C3C],
      ["Podcast Team", 0x3498DB], ["Approved Guest", 0x2ECC71],
      ["Past Guest", 0x9B59B6], ["Guest Applicant", 0xF1C40F],
      ["Community Member", 0x95A5A6]
    ];
    for (const [roleName, color] of definitions) await ensureRole(env, guildId, roleName, color);
    await replyFollowup(env, interaction, "Created or verified the Real Talk with Brandon roles. Channel/category setup is not yet included in this first Workers migration build.");
    await logStaff(env, guildId, `Role setup completed by <@${actor}>.`);
    return;
  }
  if (name === "track-application" || name === "approve-guest" || name === "decline-guest") {
    const user = await getUser(env, guestId);
    const status = name === "approve-guest" ? "approved" :
      name === "decline-guest" ? "declined" : option(interaction, "status");
    const privateNotes = name === "decline-guest" ? (option(interaction, "reason") || "") : notes;
    await saveApplication(env, guildId, guestId, user.username, status, privateNotes, actor);
    if (name === "approve-guest") {
      const role = await findRole(env, guildId, "Approved Guest");
      if (role) await assignRole(env, guildId, guestId, role.id, true);
      await sendDM(env, guestId,
        "Your application to Real Talk with Brandon has been approved. Choose an interview time here: " + env.BOOKING_URL);
      await replyFollowup(env, interaction, `Approved <@${guestId}> and sent the booking link privately.`);
    } else if (name === "decline-guest") {
      await sendDM(env, guestId,
        "Thank you for applying to Real Talk with Brandon. After review, we are unable to move forward at this time. " +
        (privateNotes || "We appreciate your interest and wish you the best."));
      await replyFollowup(env, interaction, `Recorded the decision for <@${guestId}> and attempted a private message.`);
    } else {
      await replyFollowup(env, interaction, `Saved <@${guestId}> as **${STATUS_LABELS[status] || status}**.`);
    }
    await logStaff(env, guildId, `Application status for <@${guestId}> changed to ${status} by <@${actor}>.`);
    return;
  }
  if (name === "application-status") {
    const row = await getApplication(env, guildId, guestId);
    if (!row) return replyFollowup(env, interaction, "No application record found for that Discord user.");
    const history = await env.DB.prepare(
      "SELECT status,created_at FROM application_history WHERE application_id=? ORDER BY id DESC LIMIT 5"
    ).bind(row.id).all();
    const lines = (history.results || []).map(x => `• ${STATUS_LABELS[x.status] || x.status} — ${x.created_at}`).join("\n");
    await replyFollowup(env, interaction,
      `**Guest application**\nGuest: <@${guestId}>\nStatus: **${STATUS_LABELS[row.status] || row.status}**\nUpdated: ${row.updated_at}\nPrivate notes: ${row.notes || "None"}\n\n**Recent history**\n${lines || "No history"}`);
    return;
  }
  if (name === "list-applications") {
    const status = option(interaction, "status") || "all";
    const result = status === "all"
      ? await env.DB.prepare("SELECT user_id,status,updated_at FROM applications WHERE guild_id=? ORDER BY updated_at DESC LIMIT 20").bind(guildId).all()
      : await env.DB.prepare("SELECT user_id,status,updated_at FROM applications WHERE guild_id=? AND status=? ORDER BY updated_at DESC LIMIT 20").bind(guildId,status).all();
    const lines = (result.results || []).map(x => `• <@${x.user_id}> — **${STATUS_LABELS[x.status] || x.status}** — ${x.updated_at.slice(0,10)}`);
    await replyFollowup(env, interaction, lines.length ? lines.join("\n") : "No application records match that filter.");
    return;
  }
  if (name === "send-booking") {
    const row = await getApplication(env, guildId, guestId);
    if (!row || !["approved","interview_scheduled"].includes(row.status)) {
      return replyFollowup(env, interaction, "This guest is not recorded as approved. Approve them first.");
    }
    await sendDM(env, guestId, "Your Real Talk with Brandon interview booking link: " + env.BOOKING_URL);
    await replyFollowup(env, interaction, `Sent the booking link privately to <@${guestId}>.`);
    return;
  }
  if (name === "schedule-guest") {
    const raw = String(option(interaction, "datetime") || "");
    const topic = option(interaction, "topic") || "To be confirmed";
    if (!/(Z|[+-]\\d{2}:\\d{2})$/i.test(raw)) {
      return replyFollowup(env, interaction, "Include a timezone, e.g. 2026-12-01T18:00:00-06:00.");
    }
    const startsAt = Date.parse(raw);
    if (!Number.isFinite(startsAt) || startsAt <= Date.now()) {
      return replyFollowup(env, interaction, "Enter a valid future date/time.");
    }
    const existing = await env.DB.prepare(
      "SELECT id FROM guest_schedules WHERE guild_id=? AND user_id=? AND status='scheduled'"
    ).bind(guildId,guestId).first();
    if (existing) return replyFollowup(env, interaction, "This guest already has an active scheduled interview.");
    const row = await getApplication(env,guildId,guestId);
    if (!row || !["approved","interview_scheduled"].includes(row.status)) {
      return replyFollowup(env, interaction, "Approve this guest before scheduling an interview.");
    }
    const id = `${guildId}-${guestId}-${startsAt}`;
    await env.DB.prepare(
      "INSERT INTO guest_schedules (id,guild_id,user_id,topic,display_datetime,starts_at,status,created_at) VALUES (?,?,?,?,?,?,?,?)"
    ).bind(id,guildId,guestId,topic,raw,startsAt,"scheduled",new Date().toISOString()).run();
    const user = await getUser(env,guestId);
    await saveApplication(env,guildId,guestId,user.username,"interview_scheduled",`Scheduled ${raw}; ${topic}`,actor);
    await sendDM(env,guestId,`Your Real Talk with Brandon interview is scheduled.\nTime: ${raw}\nTopic: ${topic}\nBooking details: ${env.BOOKING_URL}\nYou will receive reminders before the interview.`);
    await replyFollowup(env,interaction,`Scheduled <@${guestId}> for ${raw}. Reminders are checked every five minutes.`);
    return;
  }
  if (name === "guest-complete") {
    const user = await getUser(env,guestId);
    await saveApplication(env,guildId,guestId,user.username,"completed","Interview marked complete.",actor);
    const past = await findRole(env,guildId,"Past Guest");
    const approved = await findRole(env,guildId,"Approved Guest");
    if (past) await assignRole(env,guildId,guestId,past.id,true);
    if (approved) await assignRole(env,guildId,guestId,approved.id,false);
    await replyFollowup(env,interaction,`Marked <@${guestId}> as a Past Guest.`);
    await logStaff(env,guildId,`<@${guestId}> marked as a Past Guest by <@${actor}>.`);
    return;
  }
  await replyFollowup(env, interaction, "That command is not implemented in this migration build yet.");
}
async function reminderSweep(env) {
  const now = Date.now();
  const due = await env.DB.prepare(
    "SELECT * FROM guest_schedules WHERE status='scheduled' AND starts_at > ? AND starts_at <= ? ORDER BY starts_at LIMIT 50"
  ).bind(now, now + 24 * 60 * 60 * 1000).all();
  for (const item of due.results || []) {
    const remaining = item.starts_at - now;
    let column, message;
    if (remaining <= 15 * 60 * 1000 && !item.reminder_15m) {
      column = "reminder_15m"; message = "Your Real Talk with Brandon interview is coming up in about 15 minutes.";
    } else if (remaining <= 60 * 60 * 1000 && !item.reminder_1h) {
      column = "reminder_1h"; message = "Your Real Talk with Brandon interview is coming up within the next hour.";
    } else if (remaining <= 24 * 60 * 60 * 1000 && !item.reminder_24h) {
      column = "reminder_24h"; message = "Your Real Talk with Brandon interview is coming up within the next 24 hours.";
    }
    if (!column) continue;
    try {
      await sendDM(env,item.user_id,`${message}\nScheduled time: ${item.display_datetime}\nBooking details: ${env.BOOKING_URL}`);
      await env.DB.prepare(`UPDATE guest_schedules SET ${column}=1 WHERE id=?`).bind(item.id).run();
    } catch (e) { console.log("Reminder DM failed", item.id, e.message); }
  }
  await env.DB.prepare("UPDATE guest_schedules SET status='past_due' WHERE status='scheduled' AND starts_at <= ?").bind(now).run();
}
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "Real Talk with Brandon Discord interactions", mode: "HTTP interactions + Durable Object Gateway prototype" });
    }
    if (request.method === "GET" && url.pathname === "/gateway/status") {
      return json(await gatewaySnapshot(env));
    }
    if (request.method !== "POST" || url.pathname !== "/interactions") return json({ error: "Not found" },404);
    const body = await request.text();
    if (!(await verifyDiscordRequest(request,body,env.DISCORD_PUBLIC_KEY))) return new Response("Invalid request signature",{status:401});
    let interaction;
    try { interaction = JSON.parse(body); } catch { return new Response("Invalid JSON",{status:400}); }
    if (interaction.type === 1) return json({ type: 1 });
    if (interaction.type !== 2) return json({ type: 4, data: { content: "Unsupported interaction.", flags: 64 } });
    ctx.waitUntil(processCommand(interaction,env).catch(async error => {
      console.error("Interaction failed:",error);
      await replyFollowup(env,interaction,`The command failed: ${String(error.message || error).slice(0,400)}`).catch(e => console.error("Followup failed",e));
    }));
    return json({ type: 5, data: { flags: 64 } });
  },
  async scheduled(controller,env,ctx) {
    ctx.waitUntil(reminderSweep(env).catch(e => console.error("Reminder sweep failed:",e)));
    const gatewayId = env.GATEWAY.idFromName("real-talk-with-brandon");
    ctx.waitUntil(env.GATEWAY.get(gatewayId).fetch("https://gateway/ensure").then(async response => {
      if (!response.ok) console.error("Gateway ensure failed:", await response.text());
    }).catch(error => console.error("Gateway start failed:", error)));
  }
};
