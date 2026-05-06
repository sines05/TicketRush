#!/bin/sh
set -e

echo "⏳ Waiting for PostgreSQL to be ready..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" 2>/dev/null; do
  sleep 1
done
echo "✅ PostgreSQL is ready"

echo "🌱 Checking if database needs seeding..."
/app/seed
echo "✅ Seed check complete"

echo "🚀 Starting TicketRush server..."
exec /app/main
