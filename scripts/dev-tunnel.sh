#!/bin/bash
# dev-tunnel.sh — Starts Next.js dev + tunnel (ngrok > cloudflared)

PORT=${PORT:-3000}
PROJECT_NAME=$(basename "$(pwd)")

echo "🚀 Starting $PROJECT_NAME on port $PORT..."

pnpm next dev -p $PORT &
NEXT_PID=$!

echo "⏳ Waiting for server..."
for i in $(seq 1 30); do
  curl -s -o /dev/null http://localhost:$PORT 2>/dev/null && break
  sleep 1
done
echo "✅ Server ready on http://localhost:$PORT"

TUNNEL_PID=""

if command -v ngrok &> /dev/null; then
  echo "🌐 Starting ngrok tunnel..."
  ngrok http $PORT --log=stdout > /tmp/ngrok-$PORT.log 2>&1 &
  TUNNEL_PID=$!
  sleep 4
  URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*"' | head -1 | cut -d'"' -f4)
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  📦 $PROJECT_NAME"
  echo "  🏠 Local:     http://localhost:$PORT"
  echo "  🌍 Public:    $URL"
  echo "  📊 Dashboard: http://localhost:4040"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
elif command -v cloudflared &> /dev/null; then
  echo "🌐 Starting cloudflared tunnel..."
  cloudflared tunnel --url http://localhost:$PORT > /tmp/cf-$PORT.log 2>&1 &
  TUNNEL_PID=$!
  sleep 6
  URL=$(grep -o "https://[^ ]*trycloudflare.com" /tmp/cf-$PORT.log | head -1)
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  📦 $PROJECT_NAME"
  echo "  🏠 Local:  http://localhost:$PORT"
  echo "  🌍 Public: $URL"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
else
  echo "❌ No tunnel tool. Install: brew install ngrok"
fi

trap "echo '🛑 Shutting down...'; kill $NEXT_PID $TUNNEL_PID 2>/dev/null; exit 0" INT TERM
wait $NEXT_PID
