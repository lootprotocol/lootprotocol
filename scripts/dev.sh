#!/usr/bin/env bash
set -euo pipefail

# Start all services and the dev server.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

echo "==> Starting Docker services"
docker compose up -d db minio createbucket

echo "==> Waiting for PostgreSQL..."
until docker compose exec -T db pg_isready -U lootprotocol > /dev/null 2>&1; do
  sleep 1
done
echo "    PostgreSQL is ready"

echo "==> Starting dev server (http://localhost:3000)"
pnpm dev
