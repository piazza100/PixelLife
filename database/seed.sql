INSERT INTO users (email, plan, locale) VALUES ('demo@pixellife.app', 'FREE', 'en')
ON DUPLICATE KEY UPDATE plan = VALUES(plan), locale = VALUES(locale);

INSERT INTO boards (user_id, name, board_type)
SELECT id, 'Skill City', 'SKILL' FROM users WHERE email = 'demo@pixellife.app'
AND NOT EXISTS (SELECT 1 FROM boards WHERE user_id = users.id);
