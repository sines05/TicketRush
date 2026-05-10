-- 000013_update_categories.up.sql

UPDATE events SET category = 'Nhạc sống' WHERE category = 'Âm nhạc & Lễ hội';
UPDATE events SET category = 'Thể Thao' WHERE category = 'Thể thao';
UPDATE events SET category = 'Hội thảo & Workshop' WHERE category = 'Hội thảo & Giáo dục';
UPDATE events SET category = 'Tham quan & Trải nghiệm' WHERE category = 'Giải trí & Trải nghiệm';
UPDATE events SET category = 'Khác' WHERE category = 'Cộng đồng & Khác';
