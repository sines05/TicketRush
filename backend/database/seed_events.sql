-- Seed sample events + zones + seats for local testing
-- Run: docker exec -i ticketrush-db psql -U user -d ticketrush < backend/database/seed_events.sql

BEGIN;

-- Avoid duplicating seeds if you run it multiple times
-- (simple check based on title prefix)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM events WHERE title LIKE 'TR Demo:%') THEN
    RAISE NOTICE 'Seed events already exist (TR Demo:*) - skipping';
    RETURN;
  END IF;
END$$;

-- Event 1
WITH evt AS (
  INSERT INTO events (title, description, banner_url, start_time, end_time, is_published)
  VALUES (
    'TR Demo: Live Concert 2026',
    'Sự kiện demo để test luồng: xem sự kiện → hàng chờ → chọn ghế → checkout.',
    NULL,
    '2026-05-20T20:00:00Z',
    '2026-05-20T23:30:00Z',
    TRUE
  )
  RETURNING id
),
zones AS (
  INSERT INTO event_zones (event_id, name, price, total_rows, seats_per_row)
  SELECT evt.id, v.name, v.price, v.total_rows, v.seats_per_row
  FROM evt
  CROSS JOIN (
    VALUES
      ('VIP',      1500000,  6, 12),
      ('STANDARD',  800000, 10, 16)
  ) AS v(name, price, total_rows, seats_per_row)
  RETURNING id, total_rows, seats_per_row
)
INSERT INTO seats (zone_id, row_label, seat_number, status)
SELECT z.id, chr(64 + r), c, 'AVAILABLE'
FROM zones z
CROSS JOIN generate_series(1, z.total_rows) AS r
CROSS JOIN generate_series(1, z.seats_per_row) AS c;

-- Event 2
WITH evt AS (
  INSERT INTO events (title, description, banner_url, start_time, end_time, is_published)
  VALUES (
    'TR Demo: E-Sports Finals',
    'Demo sự kiện e-sports với nhiều zone và số ghế vừa phải để test realtime seat status.',
    NULL,
    '2026-06-02T16:00:00Z',
    '2026-06-02T20:30:00Z',
    TRUE
  )
  RETURNING id
),
zones AS (
  INSERT INTO event_zones (event_id, name, price, total_rows, seats_per_row)
  SELECT evt.id, v.name, v.price, v.total_rows, v.seats_per_row
  FROM evt
  CROSS JOIN (
    VALUES
      ('PREMIUM', 1200000,  5, 14),
      ('A',        650000,  8, 18),
      ('B',        450000,  8, 18)
  ) AS v(name, price, total_rows, seats_per_row)
  RETURNING id, total_rows, seats_per_row
)
INSERT INTO seats (zone_id, row_label, seat_number, status)
SELECT z.id, chr(64 + r), c, 'AVAILABLE'
FROM zones z
CROSS JOIN generate_series(1, z.total_rows) AS r
CROSS JOIN generate_series(1, z.seats_per_row) AS c;

-- Event 3
WITH evt AS (
  INSERT INTO events (title, description, banner_url, start_time, end_time, is_published)
  VALUES (
    'TR Demo: Summer Festival',
    'Festival ngoài trời (demo). Seat map nhỏ để bạn test nhanh thao tác chọn ghế.',
    NULL,
    '2026-07-18T15:00:00Z',
    '2026-07-18T21:30:00Z',
    TRUE
  )
  RETURNING id
),
zones AS (
  INSERT INTO event_zones (event_id, name, price, total_rows, seats_per_row)
  SELECT evt.id, v.name, v.price, v.total_rows, v.seats_per_row
  FROM evt
  CROSS JOIN (
    VALUES
      ('FRONT',   1000000,  4, 12),
      ('MIDDLE',   700000,  6, 14),
      ('BACK',     400000,  6, 14)
  ) AS v(name, price, total_rows, seats_per_row)
  RETURNING id, total_rows, seats_per_row
)
INSERT INTO seats (zone_id, row_label, seat_number, status)
SELECT z.id, chr(64 + r), c, 'AVAILABLE'
FROM zones z
CROSS JOIN generate_series(1, z.total_rows) AS r
CROSS JOIN generate_series(1, z.seats_per_row) AS c;

COMMIT;
