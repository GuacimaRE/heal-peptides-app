-- HEAL Peptides — Ticket #2: user_consents table
-- Run this in: https://supabase.com/dashboard/project/odtexqyvjxxdgysuxoxb/sql/new

CREATE TABLE IF NOT EXISTS user_consents (
  user_id     UUID        NOT NULL,
  consent_type TEXT        NOT NULL,
  agreed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address  TEXT,
  PRIMARY KEY (user_id, consent_type)
);

-- Enable RLS
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

-- Users can only insert/read their own consents
CREATE POLICY "Users insert own consents"
  ON user_consents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own consents"
  ON user_consents FOR SELECT
  USING (auth.uid() = user_id);
