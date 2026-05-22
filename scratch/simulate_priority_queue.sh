#!/bin/bash

# Tìm ID sự kiện từ slug
EVENT_ID=$(docker exec ticketrush-db psql -U user -d ticketrush -t -c "SELECT id FROM events WHERE slug='jack---j97-concert-dom-dom-in-the-stars' LIMIT 1" | xargs)

if [ -z "$EVENT_ID" ]; then
  echo "Error: event not found. Please run seed."
  exit 1
fi

QUEUE_KEY="event:${EVENT_ID}:queue"
ACTIVE_KEY="event:${EVENT_ID}:active"
COUNTER_KEY="queue:event:${EVENT_ID}:counter"
PROCESSED_KEY="queue:event:${EVENT_ID}:processed_counter"

echo "🎯 Starting PERFECT REALTIME DEMO for event: $EVENT_ID"

# 1. RESET: Làm sạch hoàn toàn
echo "   [1/4] Deep cleaning Redis (Queue + Sessions)..."
docker exec ticketrush-redis redis-cli DEL "$QUEUE_KEY" "$ACTIVE_KEY" "$COUNTER_KEY" "$PROCESSED_KEY" > /dev/null
docker exec ticketrush-redis sh -c "redis-cli --scan --pattern 'queue_session*' | xargs -r redis-cli DEL" > /dev/null
docker exec ticketrush-redis sh -c "redis-cli --scan --pattern 'queue_session_lookup*' | xargs -r redis-cli DEL" > /dev/null

# 2. SETUP: Tạo kịch bản phòng đầy
echo "   [2/4] Setting up queue (100 active members, 50 waiting)..."
# Fill active pool
for i in {1..100}; do
  docker exec ticketrush-redis redis-cli SADD "$ACTIVE_KEY" "bot-active-$i" > /dev/null
done

# Fill waiting queue
for i in {1..50}; do
  UUID=$(uuidgen)
  SCORE=$(python3 -c "import time; print(10e18 + time.time() * 1e9)")
  docker exec ticketrush-redis redis-cli ZADD "$QUEUE_KEY" "$SCORE" "$UUID" > /dev/null
  docker exec ticketrush-redis redis-cli INCR "$COUNTER_KEY" > /dev/null
done

echo ""
echo "🔥 SETUP COMPLETE!"
echo "👉 ACTION: Join the Jack concert on browser NOW."
echo "   Waiting 5 seconds for you to enter the queue..."
echo ""

# 3. WAIT
for i in {5..1}; do
  echo -ne "   Processing starts in $i seconds... \r"
  sleep 1
done
echo -e "\n"

# 4. ADVANCE: Giải phóng phòng mua vé theo từng đợt
echo "   [3/4] Releasing bots fast to trigger Go Worker..."
for i in {1..8}; do
  # Mỗi đợt xóa 10 con bot để tạo 10 chỗ trống (Nhanh gấp đôi)
  for j in {1..10}; do
    BOT_IDX=$(( (i-1)*10 + j ))
    docker exec ticketrush-redis redis-cli SRem "$ACTIVE_KEY" "bot-active-$BOT_IDX" > /dev/null
  done

  CURRENT_PROCESSED=$(docker exec ticketrush-redis redis-cli GET "$PROCESSED_KEY")
  if [ -z "$CURRENT_PROCESSED" ]; then CURRENT_PROCESSED=0; fi
  echo "   • Batch $i: 10 spots opened. Current processed index: $CURRENT_PROCESSED"

  # Chờ 1.5 giây (Tốc độ tối ưu)
  sleep 1.5
done

# Final push: Ensure user gets in
echo "   [!] Final push: Clearing active pool..."
docker exec ticketrush-redis redis-cli DEL "$ACTIVE_KEY" > /dev/null

echo ""
echo "🎉 DEMO FINISHED! You should have been redirected."
echo "   [4/4] Cleanup in 10 seconds..."
sleep 10
docker exec ticketrush-redis redis-cli DEL "$QUEUE_KEY" "$ACTIVE_KEY" "$COUNTER_KEY" "$PROCESSED_KEY" > /dev/null
