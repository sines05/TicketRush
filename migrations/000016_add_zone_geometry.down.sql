ALTER TABLE event_zones
    DROP COLUMN IF EXISTS canvas_x,
    DROP COLUMN IF EXISTS canvas_y,
    DROP COLUMN IF EXISTS width,
    DROP COLUMN IF EXISTS height,
    DROP COLUMN IF EXISTS rotation_angle,
    DROP COLUMN IF EXISTS capacity,
    DROP COLUMN IF EXISTS shape_type;
