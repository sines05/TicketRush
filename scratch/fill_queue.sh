#!/bin/bash

# Fetch the EVENT_ID of the 'Jack 97' event dynamically
EVENT_ID=$(docker exec ticketrush-db psql -U user -d ticketrush -t -c "SELECT id FROM events WHERE slug='jack---j97-concert-dom-dom-in-the-stars' LIMIT 1" | xargs)

if [ -z "$EVENT_ID" ]; then
  echo "Error: Event not found!"
  exit 1
fi

if [ "$1" == "clear" ]; then
  docker exec ticketrush-redis redis-cli DEL "event:${EVENT_ID}:active"
  echo "Queue cleared for event: $EVENT_ID"
  exit 0
fi

echo "Flooding queue for event: $EVENT_ID"

# Clean up existing active users just in case
docker exec ticketrush-redis redis-cli DEL "event:${EVENT_ID}:active"

# Add 100 fake active users
for i in {1..100}; do
  UUID=$(uuidgen)
  docker exec ticketrush-redis redis-cli SADD "event:${EVENT_ID}:active" "$UUID" > /dev/null
done

echo "Added 100 dummy users to event:${EVENT_ID}:active"
echo "Current active user count:"
docker exec ticketrush-redis redis-cli SCARD "event:${EVENT_ID}:active"
