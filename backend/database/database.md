// ==========================================
// ENUMS (KIỂU DỮ LIỆU TỰ ĐỊNH NGHĨA)
// ==========================================

Enum user_role {
  ADMIN
  CUSTOMER
}

Enum gender_type {
  MALE
  FEMALE
  OTHER
}

Enum seat_status {
  AVAILABLE
  LOCKED
  SOLD
}

Enum order_status {
  PENDING
  COMPLETED
  CANCELLED
}

// ==========================================
// TABLES (CÁC BẢNG DỮ LIỆU)
// ==========================================

Table users {
  id uuid [pk, default: `gen_random_uuid()`]
  email varchar(255) [unique, not null]
  password_hash varchar(255) [not null]
  full_name varchar(100) [not null]
  role user_role [default: "CUSTOMER"]
  gender gender_type
  date_of_birth date
  created_at timestamp [default: `CURRENT_TIMESTAMP`]
  updated_at timestamp [default: `CURRENT_TIMESTAMP`]
}

Table events {
  id uuid [pk, default: `gen_random_uuid()`]
  title varchar(255) [not null]
  description text
  banner_url varchar(255)
  start_time timestamp [not null]
  end_time timestamp
  is_published boolean [default: false]
  created_at timestamp [default: `CURRENT_TIMESTAMP`]
  updated_at timestamp [default: `CURRENT_TIMESTAMP`]
}

Table event_zones {
  id uuid [pk, default: `gen_random_uuid()`]
  event_id uuid [not null, ref: > events.id]
  name varchar(50) [not null, note: "Ví dụ: Khu VIP A, Standard B"]
  price decimal(12,2) [not null]
  total_rows int [not null]
  seats_per_row int [not null]
  
  indexes {
    (event_id, name) [unique]
  }
}

Table seats {
  id uuid [pk, default: `gen_random_uuid()`]
  zone_id uuid [not null, ref: > event_zones.id]
  row_label varchar(10) [not null, note: "Ví dụ: A, B, C"]
  seat_number int [not null, note: "Ví dụ: 1, 2, 3"]
  status seat_status [default: "AVAILABLE"]
  locked_by_user_id uuid [ref: > users.id]
  locked_at timestamp
  updated_at timestamp [default: `CURRENT_TIMESTAMP`]
  
  indexes {
    (zone_id, row_label, seat_number) [unique]
    (zone_id, status) [name: "idx_seats_zone_status"]
    (status, locked_at) [name: "idx_seats_expiration", note: "Partial index for WHERE status = LOCKED"]
  }
}

Table orders {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [not null, ref: > users.id]
  event_id uuid [not null, ref: > events.id]
  total_amount decimal(12,2) [not null]
  status order_status [default: "PENDING"]
  expires_at timestamp [not null, note: "Thời hạn 10 phút để thanh toán"]
  created_at timestamp [default: `CURRENT_TIMESTAMP`]
  updated_at timestamp [default: `CURRENT_TIMESTAMP`]
  
  indexes {
    (event_id, status) [name: "idx_orders_status_event"]
  }
}

Table order_items {
  id uuid [pk, default: `gen_random_uuid()`]
  order_id uuid [not null, ref: > orders.id]
  seat_id uuid [not null, ref: > seats.id]
  price decimal(12,2) [not null, note: "Lưu giá tại thời điểm mua"]
  
  indexes {
    (order_id, seat_id) [unique]
  }
}

Table tickets {
  id uuid [pk, default: `gen_random_uuid()`]
  order_id uuid [not null, ref: > orders.id]
  seat_id uuid [unique, not null, ref: - seats.id, note: "Quan hệ 1-1, đảm bảo 1 ghế chỉ ra 1 vé"]
  user_id uuid [not null, ref: > users.id]
  qr_code_token varchar(255) [unique, not null]
  is_checked_in boolean [default: false]
  created_at timestamp [default: `CURRENT_TIMESTAMP`]
  updated_at timestamp [default: `CURRENT_TIMESTAMP`]
}