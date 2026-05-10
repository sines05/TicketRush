-- 000014_migrate_category_labels_to_keys.down.sql

UPDATE events SET category = 'Nhạc sống' WHERE category = 'music_festival';
UPDATE events SET category = 'Thể Thao' WHERE category = 'sports';
UPDATE events SET category = 'Sân khấu & Nghệ thuật' WHERE category = 'arts_stage';
UPDATE events SET category = 'Hội thảo & Workshop' WHERE category = 'education_workshop';
UPDATE events SET category = 'Tham quan & Trải nghiệm' WHERE category = 'experience_entertainment';
UPDATE events SET category = 'Khác' WHERE category = 'other';

ALTER TABLE events ALTER COLUMN category SET DEFAULT 'Nhạc sống';
