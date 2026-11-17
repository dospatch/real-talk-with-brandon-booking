CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT,
  status TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  UNIQUE(guild_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_applications_guild_status ON applications(guild_id, status, updated_at);
CREATE TABLE IF NOT EXISTS application_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id TEXT NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  changed_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(application_id) REFERENCES applications(id)
);
CREATE TABLE IF NOT EXISTS guest_schedules (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  topic TEXT,
  display_datetime TEXT NOT NULL,
  starts_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  reminder_24h INTEGER NOT NULL DEFAULT 0,
  reminder_1h INTEGER NOT NULL DEFAULT 0,
  reminder_15m INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_schedules_due ON guest_schedules(status, starts_at);
