#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="${1:-main}"

cd "$ROOT_DIR"

echo "[1/5] Checking git worktree..."
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Working tree has uncommitted changes. Commit or stash them before updating."
  exit 1
fi

echo "[2/5] Fetching latest code from origin/$BRANCH..."
git fetch origin "$BRANCH"

CURRENT_COMMIT="$(git rev-parse --short HEAD)"
REMOTE_COMMIT="$(git rev-parse --short "origin/$BRANCH")"

echo "Current commit: $CURRENT_COMMIT"
echo "Remote commit:  $REMOTE_COMMIT"

echo "[3/5] Pulling latest code..."
git pull --ff-only origin "$BRANCH"

echo "[4/5] Stopping current containers..."
docker compose down

echo "[5/5] Rebuilding and starting containers..."
docker compose up -d --build

echo "Update completed successfully."
docker compose ps
