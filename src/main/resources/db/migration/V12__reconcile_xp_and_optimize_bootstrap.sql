UPDATE users u
LEFT JOIN (
  SELECT user_id, COALESCE(SUM(xp_awarded), 0) AS awarded_xp
  FROM boards
  WHERE status = 'COMPLETED'
  GROUP BY user_id
) totals ON totals.user_id = u.id
SET u.total_xp = COALESCE(totals.awarded_xp, 0),
    u.grade_code = CASE
      WHEN COALESCE(totals.awarded_xp, 0) >= 3000 THEN 'CONSERVATOR'
      WHEN COALESCE(totals.awarded_xp, 0) >= 1500 THEN 'BOTANIST'
      WHEN COALESCE(totals.awarded_xp, 0) >= 700 THEN 'GARDENER'
      WHEN COALESCE(totals.awarded_xp, 0) >= 300 THEN 'GROVE'
      WHEN COALESCE(totals.awarded_xp, 0) >= 100 THEN 'SPROUT'
      ELSE 'SEED'
    END;

CREATE INDEX idx_boards_user_completed_at ON boards(user_id, completed_at);
