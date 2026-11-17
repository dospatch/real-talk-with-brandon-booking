const DISCORD_API = "https://discord.com/api/v10";
const KEEPALIVE_MS = 10 * 60 * 1000;
const RECONNECT_MS = 15 * 1000;

export class DiscordGateway {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.socket = null;
    this.status = "stopped";
    this.lastError = null;
    this.lastReadyAt = null;
    this.user = null;
    this.sequence = null;
    this.sessionId = null;
    this.resumeGatewayUrl = null;
    this.heartbeatInterval = null;
    this.heartbeatTimer = null;
    this.heartbeatStartTimer = null;
    this.reconnectTimer = null;
    this.keepaliveTimer = null;
    this.awaitingHeartbeatAck = false;
    this.connecting = false;
    this.reconnects = 0;
    this.initialized = this.loadSession();
    this.scheduleKeepalive();
  }

  async loadSession() {
    const saved = await this.ctx.storage.get([
      "gatewaySessionId", "gatewayResumeUrl", "gatewaySequence", "gatewayReadyAt", "gatewayUser"
    ]);
    this.sessionId = saved.gatewaySessionId || null;
    this.resumeGatewayUrl = saved.gatewayResumeUrl || null;
    this.sequence = saved.gatewaySequence ?? null;
    this.lastReadyAt = saved.gatewayReadyAt || null;
    this.user = saved.gatewayUser || null;
  }

  scheduleKeepalive() {
    // A pending timer is one of Cloudflare's documented Durable Object
    // eviction-prevention operations. Re-arm it before the 15-minute window.
    this.keepaliveTimer = setTimeout(() => {
      this.keepaliveTimer = null;
      this.scheduleKeepalive();
      if (!this.socket || this.socket.readyState >= WebSocket.CLOSING) {
        this.ctx.waitUntil(this.connectGateway().catch(error => {
          this.lastError = String(error?.message || error);
          this.scheduleReconnect();
        }));
      }
    }, KEEPALIVE_MS);
  }

  async connectGateway() {
    await this.initialized;
    if (this.connecting) return;
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) return;
    if (!this.env.DISCORD_TOKEN) throw new Error("DISCORD_TOKEN secret is missing");

    this.connecting = true;
    this.status = "connecting";
    try {
      let gatewayUrl = this.resumeGatewayUrl;
      if (!gatewayUrl) {
        const response = await fetch(DISCORD_API + "/gateway/bot", {
          headers: { Authorization: `Bot ${this.env.DISCORD_TOKEN}` }
        });
        if (!response.ok) throw new Error(`Discord gateway lookup failed: HTTP ${response.status}`);
        const data = await response.json();
        gatewayUrl = data.url;
      }
      if (!gatewayUrl) throw new Error("Discord did not return a Gateway URL");

      const separator = gatewayUrl.includes("?") ? "&" : "?";
      const socket = new WebSocket(`${gatewayUrl}${separator}v=10&encoding=json`);
      this.socket = socket;
      socket.addEventListener("open", () => {
        this.status = "connecting";
        this.lastError = null;
      });
      socket.addEventListener("message", event => {
        this.ctx.waitUntil(this.handleGatewayMessage(event.data).catch(error => {
          this.lastError = String(error?.message || error);
          console.error("Gateway message handler failed:", this.lastError);
        }));
      });
      socket.addEventListener("error", () => {
        this.lastError = "Discord Gateway WebSocket error";
      });
      socket.addEventListener("close", event => {
        if (this.socket === socket) this.socket = null;
        this.clearHeartbeat();
        this.status = "disconnected";
        if (event.code !== 1000) this.lastError = `Gateway closed (${event.code}): ${event.reason || "no reason"}`;
        this.scheduleReconnect();
      });
    } finally {
      this.connecting = false;
    }
  }

  send(payload) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify(payload));
    return true;
  }

  identify() {
    // GUILDS intent is sufficient for a persistent bot session/presence.
    // Slash commands continue to arrive through the existing HTTP endpoint.
    this.send({
      op: 2,
      d: {
        token: this.env.DISCORD_TOKEN,
        intents: 1,
        properties: {
          os: "cloudflare",
          browser: "real-talk-with-brandon",
          device: "real-talk-with-brandon"
        },
        presence: {
          status: "online",
          since: null,
          activities: [{ name: "Real Talk with Brandon", type: 0 }],
          afk: false
        }
      }
    });
  }

  resume() {
    this.send({
      op: 6,
      d: {
        token: this.env.DISCORD_TOKEN,
        session_id: this.sessionId,
        seq: this.sequence
      }
    });
  }

  startHeartbeat(interval) {
    this.clearHeartbeat();
    this.heartbeatInterval = interval;
    this.heartbeatStartTimer = setTimeout(() => {
      this.sendHeartbeat();
      this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), interval);
    }, Math.floor(Math.random() * interval));
  }

  sendHeartbeat() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    if (this.awaitingHeartbeatAck) {
      this.socket.close(4000, "Heartbeat acknowledgement timed out");
      return;
    }
    this.awaitingHeartbeatAck = true;
    this.send({ op: 1, d: this.sequence });
  }

  clearHeartbeat() {
    if (this.heartbeatStartTimer) clearTimeout(this.heartbeatStartTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatStartTimer = null;
    this.heartbeatTimer = null;
    this.heartbeatInterval = null;
    this.awaitingHeartbeatAck = false;
  }

  async handleGatewayMessage(raw) {
    const payload = JSON.parse(typeof raw === "string" ? raw : await raw.text());
    if (payload.s !== null && payload.s !== undefined) {
      this.sequence = payload.s;
      if (payload.op === 0) await this.ctx.storage.put("gatewaySequence", this.sequence);
    }

    switch (payload.op) {
      case 10: {
        const interval = Number(payload.d?.heartbeat_interval);
        if (!Number.isFinite(interval) || interval < 1000) throw new Error("Invalid Gateway heartbeat interval");
        this.startHeartbeat(interval);
        if (this.sessionId && this.resumeGatewayUrl) this.resume();
        else this.identify();
        break;
      }
      case 11:
        this.awaitingHeartbeatAck = false;
        break;
      case 1:
        this.awaitingHeartbeatAck = true;
        this.send({ op: 1, d: this.sequence });
        break;
      case 7:
        this.socket?.close(4000, "Discord requested reconnect");
        this.scheduleReconnect(1000);
        break;
      case 9:
        if (payload.d === false) await this.clearSession();
        this.socket?.close(4000, "Invalid Gateway session");
        this.scheduleReconnect(3000 + Math.floor(Math.random() * 2000));
        break;
      case 0:
        if (payload.t === "READY") {
          this.sessionId = payload.d.session_id;
          this.resumeGatewayUrl = payload.d.resume_gateway_url;
          this.user = payload.d.user ? {
            id: payload.d.user.id,
            username: payload.d.user.username,
            discriminator: payload.d.user.discriminator
          } : null;
          this.lastReadyAt = new Date().toISOString();
          this.status = "online";
          this.lastError = null;
          await this.ctx.storage.put({
            gatewaySessionId: this.sessionId,
            gatewayResumeUrl: this.resumeGatewayUrl,
            gatewaySequence: this.sequence,
            gatewayReadyAt: this.lastReadyAt,
            gatewayUser: this.user
          });
          console.log("Real Talk with Brandon Gateway is READY:", this.user?.username || "bot");
        } else if (payload.t === "RESUMED") {
          this.status = "online";
          this.lastError = null;
          console.log("Real Talk with Brandon Gateway session resumed");
        }
        break;
      default:
        break;
    }
  }

  async clearSession() {
    this.sessionId = null;
    this.resumeGatewayUrl = null;
    this.sequence = null;
    await this.ctx.storage.delete([
      "gatewaySessionId", "gatewayResumeUrl", "gatewaySequence"
    ]);
  }

  scheduleReconnect(delay = RECONNECT_MS) {
    if (this.reconnectTimer) return;
    this.reconnects += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.ctx.waitUntil(this.connectGateway().catch(error => {
        this.lastError = String(error?.message || error);
        this.scheduleReconnect(Math.min(RECONNECT_MS * 2, 120000));
      }));
    }, delay);
  }

  snapshot() {
    return {
      ok: true,
      gateway: this.status,
      connected: this.status === "online",
      user: this.user,
      lastReadyAt: this.lastReadyAt,
      reconnects: this.reconnects,
      lastError: this.lastError,
      intents: ["GUILDS"]
    };
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/ensure") {
      try {
        await this.connectGateway();
        return Response.json(this.snapshot());
      } catch (error) {
        this.lastError = String(error?.message || error);
        return Response.json(this.snapshot(), { status: 503 });
      }
    }
    if (url.pathname === "/status") return Response.json(this.snapshot());
    return new Response("Not found", { status: 404 });
  }
}
