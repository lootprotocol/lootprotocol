#!/usr/bin/env bash
set -euo pipefail

# Wipe the database and re-seed it from scratch.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

echo "==> Resetting database"
pnpm prisma migrate reset --force

echo "==> Database reset and re-seeded"
