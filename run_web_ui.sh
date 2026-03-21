#!/bin/bash

# Script to run the Web UI (Next.js & Convex) together

# Exit on error
set -e

# get script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

cd "$DIR/web"

echo "========================================="
echo "🚀 Starting Cal AI Clone Web UI"
echo "========================================="

# 1. Run Convex Backend (Internal API)
# Runs in the background
echo "-> Starting Convex Dev server..."
npx convex dev &
CONVEX_PID=$!

# 2. Run Next.js Frontend
echo "-> Starting Next.js Dev server..."
# Give Convex a moment to initialize just in case
sleep 2

echo "-> Cleaning Next.js cache..."
rm -rf .next/cache

npm run dev &
NEXT_PID=$!

echo "========================================="
echo "✅ Both servers are running in the background."
echo "   - Frontend: http://localhost:3000"
echo "   - Backend: Convex is running"
echo "========================================="
echo "Press [Ctrl+C] to stop both servers."
echo "========================================="

# Clean up function on exit (Ctrl+C)
cleanup() {
  echo ""
  echo "🛑 Stopping servers..."
  # Kill Convex using its PID
  if kill -0 $CONVEX_PID 2>/dev/null; then
    kill $CONVEX_PID
  fi
  # Kill Next.js using its PID
  if kill -0 $NEXT_PID 2>/dev/null; then
    kill $NEXT_PID
  fi
  echo "✅ Servers stopped."
  exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# Keep the script running to hold the processes
wait
