#!/bin/bash
# dev-tunnel.sh — Starts Next.js dev + Cloudflare tunnel
# Usage: ./scripts/dev-tunnel.sh

PORT=${PORT:-3000}
PROJECT_NAME=$(basename "$(pwd)")

echo "🚀 Starting $PROJECT_NAME on port $PORT..."

# Start Next.js dev server
pnpm next dev -p $PORT &
NEXT_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for server..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "" http://localhost:$PORT 2>/dev/null; then
    break
  fi
  sleep 1
done

# Start Cloudflare tunnel
echo "🌐 Starting tunnel..."
cloudflared tunnel --url http://localhost:$PORT 2>&1 | grep --line-buffered "trycloudflare.com" | head -1 | while read line; do
  URL=$(echo "$line" | grep -o "https://[^ ]*trycloudflare.com")
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  📦 $PROJECT_NAME"
  echo "  🏠 Local:  http://localhost:$PORT"
  echo "  🌍 Public: $URL"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
done &
TUNNEL_PID=$!

# Keep cloudflared running
cloudflared tunnel --url http://localhost:$PORT > /dev/null 2>&1 &
CF_PID=$!

# Cleanup on exit
trap "echo '🛑 Shutting down...'; kill $NEXT_PID $TUNNEL_PID $CF_PID 2>/dev/null; exit" INT TERM

# Wait for Next.js
wait $NEXT_PID
