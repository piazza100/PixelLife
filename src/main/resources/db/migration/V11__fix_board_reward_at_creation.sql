ALTER TABLE boards
    ADD COLUMN reward_species_code VARCHAR(30) NULL AFTER color,
    ADD COLUMN reward_color_code VARCHAR(20) NULL AFTER reward_species_code;

UPDATE boards b
JOIN plants p ON p.board_id = b.id
JOIN plant_colors c ON c.code = p.color_code
SET b.reward_species_code = p.species_code,
    b.reward_color_code = p.color_code,
    b.color = c.css_color;

UPDATE boards b
JOIN plant_colors c ON UPPER(c.css_color) = UPPER(b.color)
SET b.reward_color_code = c.code
WHERE b.reward_color_code IS NULL;

UPDATE boards
SET reward_species_code = 'OAK'
WHERE reward_species_code IS NULL;

UPDATE boards
SET reward_color_code = 'GREEN', color = '#159651'
WHERE reward_color_code IS NULL;

ALTER TABLE boards
    MODIFY reward_species_code VARCHAR(30) NOT NULL,
    MODIFY reward_color_code VARCHAR(20) NOT NULL,
    ADD CONSTRAINT fk_boards_reward_species FOREIGN KEY (reward_species_code) REFERENCES plant_species(code),
    ADD CONSTRAINT fk_boards_reward_color FOREIGN KEY (reward_color_code) REFERENCES plant_colors(code);
