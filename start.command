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
# no-cache so browsers always pick up edited files instead of a stale app.js
exec python3 -c '
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
class H(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()
ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
' "$PORT"
