#!/bin/bash
# Starts the Haven Toronto TV display. Double-click in Finder or run ./start.command
cd "$(dirname "$0")"
PORT="${PORT:-8080}"
URL="http://127.0.0.1:${PORT}/"
echo ""
echo "  Haven Toronto TV display → ${URL}"
echo "  (Use 127.0.0.1, not localhost — Spotify requires it.)  Ctrl+C to stop."
echo ""
( sleep 1 && open "$URL" ) >/dev/null 2>&1 &
exec python3 -m http.server "$PORT" --bind 127.0.0.1
