-- 000013_update_categories.down.sql

UPDATE events SET category = 'Âm nhạc & Lễ hội' WHERE category = 'Nhạc sống';
UPDATE events SET category = 'Thể thao' WHERE category = 'Thể Thao';
UPDATE events SET category = 'Hội thảo & Giáo dục' WHERE category = 'Hội thảo & Workshop';
UPDATE events SET category = 'Giải trí & Trải nghiệm' WHERE category = 'Tham quan & Trải nghiệm';
UPDATE events SET category = 'Cộng đồng & Khác' WHERE category = 'Khác';
