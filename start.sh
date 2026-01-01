#!/usr/bin/env bash
set -euo pipefail

# Check for public mode early
PUBLIC_MODE=false
if [[ "${1:-}" == "--public" ]]; then
  PUBLIC_MODE=true
fi

# Ensure port 3001 is free
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
  echo "Port 3001 is already in use. Cleaning up..."
  lsof -Pi :3001 -sTCP:LISTEN -t | xargs kill -9 2>/dev/null || true
  sleep 1
fi

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

if [ "$PUBLIC_MODE" = false ]; then
  echo "Starting Socket.IO server on :3001 (Dev)..."
  npm run server &
  SERVER_PID=$!
else
  # In public mode, we don't start the dev server here
  # It will be started later via server:prod
  SERVER_PID=0
fi

# Best-effort wait for port 3001
wait_for_port() {
  local port="$1"
  for _ in {1..20}; do
    if (echo >/dev/tcp/127.0.0.1/$port) >/dev/null 2>&1; then return 0; fi
    sleep 0.5
  done
  return 0
}
if [ "$PUBLIC_MODE" = false ]; then
  wait_for_port 3001 || true
fi

if [ "$PUBLIC_MODE" = false ]; then
  echo ""
  echo "LAN URLs:"
  echo "  Host setup:  http://$IP:3000/host"
  echo "  Player join: http://$IP:3000"
  echo ""
fi

cleanup() {
  echo ""
  echo "Shutting down..."
  if [ "$SERVER_PID" -ne 0 ]; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi
  # Fallback cleanup for the port
  lsof -Pi :3001 -sTCP:LISTEN -t | xargs kill -9 2>/dev/null || true
}
trap cleanup EXIT INT TERM

if [ "$PUBLIC_MODE" = true ]; then
  echo "--- PUBLIC MODE ---"
  echo "Building frontend..."
  npm run build
  
  echo ""
  echo "Starting unified production server on :3001..."
  echo "To make this accessible on the internet, run in a separate terminal:"
  echo "  cloudflared tunnel run --url http://localhost:3001 impostor-game"
  echo ""
  
  exec npm run server:prod
fi

echo "Starting Vite dev server on :3000 (LAN)..."
npm run dev:lan


