ALTER TABLE users
  ADD COLUMN device_key VARCHAR(64) NULL AFTER id,
  ADD COLUMN display_name VARCHAR(40) NULL AFTER email,
  ADD COLUMN total_xp INT NOT NULL DEFAULT 0 AFTER locale,
  ADD COLUMN grade_code VARCHAR(20) NOT NULL DEFAULT 'SEED' AFTER total_xp,
  ADD UNIQUE KEY uk_users_device_key (device_key);

ALTER TABLE boards
  ADD COLUMN start_date DATE NULL AFTER block_shape,
  ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' AFTER goal_days,
  ADD COLUMN completed_at DATETIME NULL AFTER ended_at,
  ADD COLUMN final_score TINYINT UNSIGNED NULL AFTER completed_at,
  ADD COLUMN xp_awarded INT NOT NULL DEFAULT 0 AFTER final_score;

UPDATE boards SET start_date = DATE(created_at) WHERE start_date IS NULL;
ALTER TABLE boards MODIFY COLUMN start_date DATE NOT NULL;
CREATE INDEX idx_boards_user_status_created ON boards (user_id, status, created_at);

CREATE TABLE daily_visits (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  visit_date DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_daily_visits_user_date (user_id, visit_date),
  CONSTRAINT fk_daily_visits_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
