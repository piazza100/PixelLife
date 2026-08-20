ALTER TABLE users
  ADD COLUMN auth_provider VARCHAR(20) NULL AFTER device_key,
  ADD COLUMN provider_subject VARCHAR(255) NULL AFTER auth_provider,
  ADD COLUMN avatar_url VARCHAR(500) NULL AFTER display_name,
  ADD COLUMN paid_until DATETIME NULL AFTER plan,
  ADD UNIQUE KEY uk_users_provider_subject (auth_provider, provider_subject);

ALTER TABLE boards
  ADD COLUMN last_recorded_at DATETIME NULL AFTER xp_awarded;

CREATE INDEX idx_boards_user_active_recent
  ON boards (user_id, status, last_recorded_at, created_at);
