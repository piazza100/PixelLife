CREATE TABLE plants (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  board_id BIGINT NOT NULL,
  season_code VARCHAR(20) NOT NULL,
  species_code VARCHAR(40) NOT NULL,
  variant_code VARCHAR(40) NOT NULL DEFAULT 'STANDARD',
  earned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_plants_board (board_id),
  KEY idx_plants_user_earned (user_id, earned_at),
  CONSTRAINT fk_plants_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_plants_board FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

CREATE TABLE badge_definitions (
  code VARCHAR(40) NOT NULL,
  name VARCHAR(60) NOT NULL,
  description VARCHAR(180) NOT NULL,
  metric_code VARCHAR(40) NOT NULL,
  target_value INT NOT NULL,
  xp_reward INT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (code)
);

CREATE TABLE user_badges (
  user_id BIGINT NOT NULL,
  badge_code VARCHAR(40) NOT NULL,
  earned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, badge_code),
  CONSTRAINT fk_user_badges_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_badges_definition FOREIGN KEY (badge_code) REFERENCES badge_definitions(code)
);

INSERT INTO badge_definitions (code, name, description, metric_code, target_value, xp_reward, sort_order) VALUES
('VISIT_3', 'Hello Again', 'Visit on 3 different days.', 'VISIT_DAYS', 3, 10, 10),
('VISIT_30', 'Familiar Face', 'Visit on 30 different days.', 'VISIT_DAYS', 30, 30, 20),
('PIXEL_10', 'First Patch', 'Save 10 daily pixels.', 'PIXEL_COUNT', 10, 10, 30),
('PIXEL_100', 'Green Field', 'Save 100 daily pixels.', 'PIXEL_COUNT', 100, 40, 40),
('PLANT_1', 'First Plant', 'Complete your first board.', 'PLANT_COUNT', 1, 15, 50),
('PLANT_10', 'Small Garden', 'Collect 10 plants.', 'PLANT_COUNT', 10, 50, 60),
('SPECIES_3', 'Plant Friend', 'Collect 3 different species.', 'SPECIES_COUNT', 3, 30, 70),
('PERFECT_1', 'Perfect Board', 'Finish one board with 100 points.', 'PERFECT_COUNT', 1, 50, 80);
