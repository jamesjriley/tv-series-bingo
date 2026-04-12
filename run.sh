#!/bin/bash
set -e

# Load env vars
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Detect LAN IP for sharing
LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

echo ""
echo "========================================="
echo "  TV Bingo"
echo "========================================="
echo ""

# Install backend deps if needed
if [ ! -d "venv" ]; then
  echo "Setting up Python virtual environment..."
  python3 -m venv venv
fi
source venv/bin/activate
pip install -q -r backend/requirements.txt

# Install frontend deps if needed
if [ ! -d "frontend/node_modules" ]; then
  echo "Installing frontend dependencies..."
  cd frontend && npm install && cd ..
fi

echo ""
echo "  Open on this device:  http://localhost:5173"
echo "  Open on other devices: http://${LAN_IP}:5173"
echo ""
echo "========================================="
echo ""

# Start backend in background
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Start frontend
cd frontend
npx vite --host 0.0.0.0 &
FRONTEND_PID=$!
cd ..

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT

wait
