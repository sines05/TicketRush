#!/bin/bash

# Fetch the EVENT_ID of the 'Jack 97' event dynamically
EVENT_ID=$(docker exec ticketrush-db psql -U user -d ticketrush -t -c "SELECT id FROM events WHERE slug='jack---j97-concert-dom-dom-in-the-stars' LIMIT 1" | xargs)

if [ -z "$EVENT_ID" ]; then
  echo "Error: Event not found!"
  exit 1
fi

if [ "$1" == "clear" ]; then
  docker exec ticketrush-redis redis-cli DEL "event:${EVENT_ID}:queue"
  docker exec ticketrush-redis redis-cli DEL "event:${EVENT_ID}:active"
  echo "Queue cleared for event: $EVENT_ID"
  exit 0
fi

echo "Flooding queue for event: $EVENT_ID"

# Clean up existing queue
docker exec ticketrush-redis redis-cli DEL "event:${EVENT_ID}:queue"
docker exec ticketrush-redis redis-cli DEL "event:${EVENT_ID}:active"

# 1. Fill 100 people into active list so the virtual queue turns ON
for i in {1..100}; do
  UUID=$(uuidgen)
  docker exec ticketrush-redis redis-cli SADD "event:${EVENT_ID}:active" "$UUID" > /dev/null
done
echo "✅ Filled active threshold (100 users)."

# 2. Fill 100 BRONZE users into the Waiting Queue
echo "⏳ Adding 100 BRONZE users to the waiting queue..."
for i in {1..100}; do
  UUID=$(uuidgen)
  # BRONZE priority is 0 -> score = (10 - 0) * 1e18 + time.Now().UnixNano()
  SCORE=$(python3 -c "import time; print(10e18 + time.time() * 1e9)")
  docker exec ticketrush-redis redis-cli ZADD "event:${EVENT_ID}:queue" "$SCORE" "$UUID" > /dev/null
done

echo "✅ Added 100 dummy BRONZE users to the waiting queue."
echo "--------------------------------------------------------"
echo "Current queue user count:"
docker exec ticketrush-redis redis-cli ZCARD "event:${EVENT_ID}:queue"
echo "--------------------------------------------------------"
echo "You can now login as a normal user, see your position > 100."
echo "Then go to Membership, upgrade to PLATINUM, and watch your position jump!"
