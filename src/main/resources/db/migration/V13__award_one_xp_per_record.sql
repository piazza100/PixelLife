UPDATE boards b
LEFT JOIN (
  SELECT board_id, COUNT(*) AS record_count
  FROM pixel_entries
  GROUP BY board_id
) e ON e.board_id = b.id
SET b.xp_awarded = LEAST(
  COALESCE(e.record_count, 0),
  CASE
    WHEN b.goal_days IS NOT NULL THEN GREATEST(b.goal_days, 1)
    ELSE GREATEST(DATEDIFF(COALESCE(b.completed_at, CURRENT_DATE), b.start_date) + 1, 1)
  END
)
WHERE b.status = 'COMPLETED';

UPDATE users u
LEFT JOIN (
  SELECT user_id, COALESCE(SUM(xp_awarded), 0) AS total_xp
  FROM boards
  WHERE status = 'COMPLETED'
  GROUP BY user_id
) x ON x.user_id = u.id
SET u.total_xp = COALESCE(x.total_xp, 0),
    u.grade_code = CASE
      WHEN COALESCE(x.total_xp, 0) >= 3000 THEN 'CONSERVATOR'
      WHEN COALESCE(x.total_xp, 0) >= 1500 THEN 'BOTANIST'
      WHEN COALESCE(x.total_xp, 0) >= 700 THEN 'GARDENER'
      WHEN COALESCE(x.total_xp, 0) >= 300 THEN 'GROVE'
      WHEN COALESCE(x.total_xp, 0) >= 100 THEN 'SPROUT'
      ELSE 'SEED'
    END;
