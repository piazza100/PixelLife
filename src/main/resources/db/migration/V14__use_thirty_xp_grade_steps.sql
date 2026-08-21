UPDATE users
SET grade_code = CASE
  WHEN total_xp >= 150 THEN 'CONSERVATOR'
  WHEN total_xp >= 120 THEN 'BOTANIST'
  WHEN total_xp >= 90 THEN 'GARDENER'
  WHEN total_xp >= 60 THEN 'GROVE'
  WHEN total_xp >= 30 THEN 'SPROUT'
  ELSE 'SEED'
END;
