-- Initial schema for the isolated Villa La Susana D1 database.
-- Idempotent: safe to re-run on this dedicated database.

CREATE TABLE IF NOT EXISTS stays (
  id TEXT PRIMARY KEY,
  property_name TEXT NOT NULL,
  guest_name TEXT,
  guest_email TEXT,
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stay_access_tokens (
  id TEXT PRIMARY KEY,
  stay_id TEXT NOT NULL REFERENCES stays(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tokens_stay ON stay_access_tokens(stay_id);

CREATE TABLE IF NOT EXISTS client_requests (
  id TEXT PRIMARY KEY,
  stay_id TEXT NOT NULL REFERENCES stays(id),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_requests_stay ON client_requests(stay_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON client_requests(status);

CREATE TABLE IF NOT EXISTS client_request_events (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES client_requests(id),
  event_type TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notification_outbox (
  id TEXT PRIMARY KEY,
  request_id TEXT REFERENCES client_requests(id),
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stay_events (
  id TEXT PRIMARY KEY,
  stay_id TEXT NOT NULL,
  title TEXT NOT NULL,
  event_date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  location TEXT,
  notes TEXT,
  event_type TEXT NOT NULL DEFAULT 'personal' CHECK(event_type IN ('personal','idea','service')),
  status TEXT NOT NULL DEFAULT 'personal' CHECK(status IN ('personal','idea','requested','pending','confirmed','cancelled')),
  linked_request_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_stay_events_stay_date ON stay_events(stay_id,event_date,start_time);
CREATE INDEX IF NOT EXISTS idx_stay_events_date ON stay_events(event_date,start_time);
CREATE INDEX IF NOT EXISTS idx_stay_events_linked_request ON stay_events(linked_request_id);

CREATE TABLE IF NOT EXISTS stay_preferences (
  stay_id TEXT PRIMARY KEY,
  reminders_enabled INTEGER NOT NULL DEFAULT 1,
  remind_day_before INTEGER NOT NULL DEFAULT 1,
  remind_hours_before INTEGER NOT NULL DEFAULT 1,
  reminder_portal INTEGER NOT NULL DEFAULT 1,
  reminder_email INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stay_notifications (
  id TEXT PRIMARY KEY,
  stay_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  reminder_type TEXT NOT NULL CHECK(reminder_type IN ('day_before','hours_before')),
  message TEXT NOT NULL,
  email_sent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  read_at TEXT,
  UNIQUE(event_id, reminder_type)
);
CREATE INDEX IF NOT EXISTS idx_stay_notifications_stay ON stay_notifications(stay_id,created_at);
