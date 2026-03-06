#!/usr/bin/env bash
set -euo pipefail

# Stop all Docker services.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

echo "==> Stopping Docker services"
docker compose down

echo "    All services stopped"
