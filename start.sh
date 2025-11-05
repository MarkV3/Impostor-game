#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js not found. Please install Node.js." >&2
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm not found. Please install npm." >&2
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

# Discover LAN IP
get_ip() {
  hostname -I 2>/dev/null | awk '{print $1}' | sed 's/^[ \t]*//;s/[ \t]*$//'
}
IP="$(get_ip || true)"
if [ -z "${IP:-}" ]; then
  IP=$(ip -o -4 addr show 2>/dev/null | awk '/scope global/ {split($4,a,"/"); print a[1]; exit}')
fi
if [ -z "${IP:-}" ]; then IP="localhost"; fi

echo "Starting Socket.IO server on :3001..."
npm run server &
SERVER_PID=$!

# Best-effort wait for port 3001
wait_for_port() {
  local port="$1"
  for _ in {1..20}; do
    if (echo >/dev/tcp/127.0.0.1/$port) >/dev/null 2>&1; then return 0; fi
    sleep 0.5
  done
  return 0
}
wait_for_port 3001 || true

echo ""
echo "LAN URLs:"
echo "  Host setup:  http://$IP:3000/host"
echo "  Player join: http://$IP:3000"
echo ""

cleanup() {
  echo ""
  echo "Shutting down..."
  kill "$SERVER_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

echo "Starting Vite dev server on :3000 (LAN)..."
npm run dev:lan


