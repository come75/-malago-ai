-- Malago client requests — schema matching the D1 tables created for this project.
-- Do not run against an existing database unless reviewed first; all statements are idempotent.

PRAGMA foreign_keys = ON;

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

CREATE TABLE IF NOT EXISTS client_requests (
  id TEXT PRIMARY KEY,
  stay_id TEXT NOT NULL REFERENCES stays(id),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

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

CREATE INDEX IF NOT EXISTS idx_requests_stay
  ON client_requests(stay_id);
CREATE INDEX IF NOT EXISTS idx_requests_status
  ON client_requests(status);
CREATE INDEX IF NOT EXISTS idx_tokens_stay
  ON stay_access_tokens(stay_id);
CREATE INDEX IF NOT EXISTS idx_request_events_request
  ON client_request_events(request_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_status
  ON notification_outbox(status, created_at);
