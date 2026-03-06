#!/bin/sh
set -e

# Build DATABASE_URL from individual env vars if not already set
if [ -z "$DATABASE_URL" ] && [ -n "$DB_HOST" ]; then
  export DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT:-5432}/${DB_NAME:-lootprotocol}"
fi

# Push database schema (creates tables if they don't exist)
echo "Running prisma db push..."
npx prisma db push --accept-data-loss 2>&1 || echo "Schema push skipped or failed"

exec "$@"
