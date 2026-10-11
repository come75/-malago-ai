-- Malago client request system — initial D1 schema
-- Apply only after creating the D1 database and configuring the Worker binding.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS stays (
  id TEXT PRIMARY KEY,
  partner_slug TEXT NOT NULL,
  reference TEXT NOT NULL UNIQUE,
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Store only a cryptographic hash of a random access token, never the token itself.
CREATE TABLE IF NOT EXISTS stay_access_tokens (
  id TEXT PRIMARY KEY,
  stay_id TEXT NOT NULL REFERENCES stays(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  scope TEXT NOT NULL DEFAULT 'traveler'
    CHECK (scope IN ('organizer', 'traveler', 'read_only')),
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_used_at TEXT
);

CREATE TABLE IF NOT EXISTS client_requests (
  id TEXT PRIMARY KEY,
  stay_id TEXT NOT NULL REFERENCES stays(id) ON DELETE CASCADE,
  created_by_token_id TEXT REFERENCES stay_access_tokens(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(details_json)),
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN (
      'received', 'in_review', 'awaiting_customer', 'quoted',
      'accepted_by_customer', 'confirmed', 'declined', 'cancelled'
    )),
  urgency TEXT NOT NULL DEFAULT 'normal'
    CHECK (urgency IN ('normal', 'high', 'urgent')),
  assigned_to TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  closed_at TEXT
);

CREATE TABLE IF NOT EXISTS client_request_events (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES client_requests(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_type TEXT NOT NULL
    CHECK (actor_type IN ('system', 'traveler', 'malago', 'supplier')),
  actor_ref TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS notification_outbox (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES client_requests(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  recipient_ref TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error_code TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  sent_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_stays_partner_status
  ON stays(partner_slug, status);
CREATE INDEX IF NOT EXISTS idx_tokens_stay_expiry
  ON stay_access_tokens(stay_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_requests_stay_created
  ON client_requests(stay_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_status_urgency
  ON client_requests(status, urgency, created_at);
CREATE INDEX IF NOT EXISTS idx_request_events_request
  ON client_request_events(request_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_status
  ON notification_outbox(status, created_at);
