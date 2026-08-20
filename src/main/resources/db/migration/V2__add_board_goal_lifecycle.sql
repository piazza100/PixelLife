ALTER TABLE boards
  ADD COLUMN goal_days INT NULL AFTER block_shape,
  ADD COLUMN ended_at DATE NULL AFTER goal_days;

CREATE INDEX idx_boards_user_ended ON boards (user_id, ended_at);
