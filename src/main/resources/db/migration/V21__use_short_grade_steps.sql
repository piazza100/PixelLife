UPDATE users
SET grade_code = CASE
  WHEN total_xp >= 50 THEN 'CONSERVATOR'
  WHEN total_xp >= 30 THEN 'BOTANIST'
  WHEN total_xp >= 20 THEN 'GARDENER'
  WHEN total_xp >= 10 THEN 'GROVE'
  WHEN total_xp >= 5 THEN 'SPROUT'
  ELSE 'SEED'
END;
