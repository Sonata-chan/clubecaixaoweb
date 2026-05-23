#!/usr/bin/env sh
set -eu

python3 -m http.server 8000 --bind 127.0.0.1 --directory . >/tmp/clubecaixao-manual-server.log 2>&1 &
server_pid=$!

cleanup() {
    kill "$server_pid" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

PW_USE_SWIFTSHADER=0 npx playwright open --browser=chromium "http://127.0.0.1:8000/index.html?testMode=1&testCase=manual"
