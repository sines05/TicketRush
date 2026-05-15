#!/bin/bash

EVENT_ID=$(docker exec ticketrush-db psql -U user -d ticketrush -t -c "SELECT id FROM events WHERE slug='jack---j97-concert-dom-dom-in-the-stars' LIMIT 1" | xargs)

if [ -z "$EVENT_ID" ]; then
  echo "Error: event not found"
  exit 1
fi

if [ "$1" == "clear" ]; then
  docker exec ticketrush-redis redis-cli DEL "event:${EVENT_ID}:queue" > /dev/null
  docker exec ticketrush-redis redis-cli DEL "event:${EVENT_ID}:active" > /dev/null
  echo "Queue cleared"
  exit 0
fi

echo "Preparing priority queue simulation..."

docker exec ticketrush-redis redis-cli DEL "event:${EVENT_ID}:queue" > /dev/null
docker exec ticketrush-redis redis-cli DEL "event:${EVENT_ID}:active" > /dev/null

for i in {1..100}; do
  UUID=$(uuidgen)
  docker exec ticketrush-redis redis-cli SADD "event:${EVENT_ID}:active" "$UUID" > /dev/null
done

for i in {1..100}; do
  UUID=$(uuidgen)
  SCORE=$(python3 -c "import time; print(10e18 + time.time() * 1e9)")
  docker exec ticketrush-redis redis-cli ZADD "event:${EVENT_ID}:queue" "$SCORE" "$UUID" > /dev/null
done

QUEUE_SIZE=$(docker exec ticketrush-redis redis-cli ZCARD "event:${EVENT_ID}:queue")
echo "Simulation ready. Waiting queue size: $QUEUE_SIZE"
