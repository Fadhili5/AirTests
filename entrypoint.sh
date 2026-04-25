#!/usr/bin/env sh
# Lightweight container entrypoint: build then start supervisor

set -euo pipefail

# If SKIP_BUILD=1 is set, skip the build step (useful in dev / prebuilt images)
if [ "${SKIP_BUILD:-0}" = "1" ]; then
  echo "[entrypoint] SKIP_BUILD=1 set, skipping build"
else
  echo "[entrypoint] Running build..."
  npm run build
fi

echo "[entrypoint] Starting supervisor..."
# exec to replace shell and forward signals to the supervisor process
exec node supervisor.js
