ALTER TABLE badge_definitions ADD COLUMN unlock_color VARCHAR(20) NULL AFTER xp_reward;

DELETE FROM user_badges;
DELETE FROM badge_definitions;
INSERT INTO badge_definitions (code,name,description,metric_code,target_value,xp_reward,unlock_color,sort_order) VALUES
('VISITOR','Visitor','Visit on 7 different days.','VISIT_DAYS',7,0,'SKY',10),
('PIXEL','Pixel','Save 30 daily records.','PIXEL_COUNT',30,0,'ORANGE',20),
('GARDENER','Gardener','Complete 3 plants.','PLANT_COUNT',3,0,'VIOLET',30),
('COLLECTOR','Collector','Collect 4 different species.','SPECIES_COUNT',4,0,'ROSE',40),
('PERFECT','Perfect','Finish one board with 100 points.','PERFECT_COUNT',1,0,'GOLD',50),
('NOTEBOOK','Notebook','Write 20 notes.','NOTE_COUNT',20,0,'MINT',60),
('STEADY_WEEK','Steady Week','Record 7 days in a row.','MAX_STREAK',7,0,'TEAL',70),
('THREE_WAYS','Three Ways','Complete all 3 board types.','COMPLETED_TYPE_COUNT',3,0,'INDIGO',80),
('LONG_JOURNEY','Long Journey','Complete a board of 90 days or more.','LONG_BOARD_COUNT',1,0,'CORAL',90),
('HUNDRED_PIXELS','Hundred Pixels','Save 100 daily records.','PIXEL_COUNT',100,0,'RUBY',100),
('FULL_GARDEN','Full Garden','Complete 10 plants.','PLANT_COUNT',10,0,'SLATE',110);

CREATE TABLE plant_species (
  code VARCHAR(30) NOT NULL,
  name VARCHAR(60) NOT NULL,
  unicode_symbol VARCHAR(8) NOT NULL,
  weight_value INT NOT NULL,
  unlock_grade VARCHAR(20) NOT NULL,
  sort_order INT NOT NULL,
  PRIMARY KEY (code), UNIQUE KEY uk_species_sort (sort_order)
);

INSERT INTO plant_species VALUES
('OAK','Oak','♣',50,'SEED',1),('CACTUS','Cactus','♜',25,'SEED',2),
('TULIP','Tulip','✿',12,'SPROUT',3),('PINE','Pine','♠',6,'SPROUT',4),
('FERN','Fern','♧',3,'GROVE',5),('SUNFLOWER','Sunflower','✹',2,'GROVE',6),
('MAPLE','Maple','♣',1,'GARDENER',7),('LOTUS','Lotus','❀',1,'GARDENER',8),
('BAMBOO','Bamboo','≋',1,'BOTANIST',9),('CHERRY','Cherry','❋',1,'BOTANIST',10),
('PALM','Palm','♨',1,'CONSERVATOR',11),('CRYSTAL','Crystal Plant','✦',1,'CONSERVATOR',12);

CREATE TABLE plant_colors (
  code VARCHAR(20) NOT NULL,
  css_color VARCHAR(20) NOT NULL,
  unlock_badge VARCHAR(40) NULL,
  sort_order INT NOT NULL,
  PRIMARY KEY (code), UNIQUE KEY uk_colors_sort (sort_order)
);

INSERT INTO plant_colors VALUES
('GREEN','#159651',NULL,1),('CREAM','#D8CFAF',NULL,2),('SKY','#4F8FD8','VISITOR',3),
('ORANGE','#D6763E','PIXEL',4),('VIOLET','#8967C7','GARDENER',5),('ROSE','#C85F7A','COLLECTOR',6),
('GOLD','#D3A62B','PERFECT',7),('MINT','#54BFA3','NOTEBOOK',8),('TEAL','#2F8C83','STEADY_WEEK',9),
('INDIGO','#5666A5','THREE_WAYS',10),('CORAL','#D96F62','LONG_JOURNEY',11),
('RUBY','#B94C5B','HUNDRED_PIXELS',12),('SLATE','#62707D','FULL_GARDEN',13);

ALTER TABLE plants
  ADD COLUMN color_code VARCHAR(20) NULL AFTER species_code,
  ADD COLUMN map_x INT NOT NULL DEFAULT 0 AFTER variant_code,
  ADD COLUMN map_y INT NOT NULL DEFAULT 0 AFTER map_x,
  ADD COLUMN reward_rule_version INT NOT NULL DEFAULT 1 AFTER map_y;

UPDATE plants SET color_code='GREEN' WHERE color_code IS NULL;
ALTER TABLE plants MODIFY color_code VARCHAR(20) NOT NULL;
CREATE UNIQUE INDEX uk_plants_user_map ON plants(user_id,map_x,map_y);
