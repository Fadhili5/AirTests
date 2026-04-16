#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${TELEGRAM_BOT_TOKEN:-}" || -z "${TELEGRAM_WEBHOOK_URL:-}" ]]; then
  echo "TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_URL are required"
  exit 1
fi

curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"${TELEGRAM_WEBHOOK_URL}\",
    \"secret_token\": \"${TELEGRAM_WEBHOOK_SECRET:-}\",
    \"allowed_updates\": [\"message\", \"callback_query\"]
  }"

echo
echo "Telegram webhook configured."

