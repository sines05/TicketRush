ALTER TABLE event_zones
    ADD COLUMN canvas_x numeric(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN canvas_y numeric(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN width numeric(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN height numeric(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN rotation_angle numeric(6,2) NOT NULL DEFAULT 0,
    ADD COLUMN capacity integer NOT NULL DEFAULT 0,
    ADD COLUMN shape_type varchar(50) NOT NULL DEFAULT 'theatre';
