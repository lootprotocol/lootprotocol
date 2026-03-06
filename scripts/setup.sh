#!/usr/bin/env bash
set -euo pipefail

# First-time setup: installs deps, starts services, runs migrations, seeds DB.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

echo "==> Copying .env (if not present)"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "    Created .env from .env.example"
else
  echo "    .env already exists, skipping"
fi

echo "==> Installing dependencies"
pnpm install

echo "==> Building workspace packages"
pnpm --filter @lootprotocol/shared-types build
pnpm --filter @lootprotocol/validation build

echo "==> Starting Docker services (PostgreSQL + MinIO)"
docker compose up -d db minio createbucket

echo "==> Waiting for PostgreSQL to be ready..."
until docker compose exec -T db pg_isready -U lootprotocol > /dev/null 2>&1; do
  sleep 1
done
echo "    PostgreSQL is ready"

echo "==> Generating Prisma client"
pnpm prisma generate

echo "==> Running database migrations"
pnpm prisma migrate dev --name init 2>/dev/null || pnpm prisma migrate dev

echo "==> Seeding database"
pnpm db:seed

echo ""
echo "Setup complete! Run: pnpm dev"
echo "Then open: http://localhost:3000"
