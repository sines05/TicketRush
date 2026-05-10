-- 000014_migrate_category_labels_to_keys.up.sql

UPDATE events SET category = 'music_festival' WHERE category IN ('Âm nhạc & Lễ hội', 'Nhạc sống');
UPDATE events SET category = 'sports' WHERE category IN ('Thể thao', 'Thể Thao');
UPDATE events SET category = 'arts_stage' WHERE category = 'Sân khấu & Nghệ thuật';
UPDATE events SET category = 'education_workshop' WHERE category IN ('Hội thảo & Giáo dục', 'Hội thảo & Workshop');
UPDATE events SET category = 'experience_entertainment' WHERE category IN ('Giải trí & Trải nghiệm', 'Tham quan & Trải nghiệm');
UPDATE events SET category = 'other' WHERE category IN ('Cộng đồng & Khác', 'Khác');

-- Update default value for future inserts
ALTER TABLE events ALTER COLUMN category SET DEFAULT 'music_festival';
