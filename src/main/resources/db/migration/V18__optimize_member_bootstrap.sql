CREATE INDEX idx_boards_user_status_goal
  ON boards(user_id, status, goal_days);
