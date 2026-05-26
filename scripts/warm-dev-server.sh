#!/usr/bin/env bash
# Warm both API routes after `npm run dev` boots so first-tester flows don't hit
# the cold-start session-map reset. Run this once after starting the dev server,
# before opening the tester's URL.
set -e
BASE="${1:-http://localhost:3000}"

echo "warming $BASE/api/chat ..."
curl -fsS "$BASE/api/chat" \
  -X POST -H "Content-Type: application/json" \
  -d '{"message":"warm up","sessionId":"warmup"}' > /dev/null

echo "warming $BASE/api/feedback-signal ..."
curl -fsS "$BASE/api/feedback-signal" \
  -X POST -H "Content-Type: application/json" \
  -d '{"session_id":"warmup","insight_id":"warmup","dwell_ms":1,"dwell_qualified":false}' > /dev/null

echo "warmed — ready for testers"
