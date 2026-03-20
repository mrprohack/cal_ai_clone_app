#!/bin/bash

# Run the Web UI (Next.js & Convex) in a detached screen session

# Check if screen is installed
if ! command -v screen &> /dev/null
then
    echo "❌ Error: 'screen' is not installed. Please install it first."
    exit 1
fi

SESSION_NAME="cal_ai_web_ui"

# Check if session already exists
if screen -list | grep -q "\.${SESSION_NAME}\s"; then
    echo "⚠️  Session '${SESSION_NAME}' is already running!"
    echo "💻 To view it, run: screen -r ${SESSION_NAME}"
    exit 0
fi

echo "🚀 Starting Web UI in background screen session '${SESSION_NAME}'..."
screen -dmS "$SESSION_NAME" ./run_web_ui.sh

echo "✅ Session started."
echo "💻 To view logs, run: screen -r ${SESSION_NAME}"
echo "💻 To detach (leave running), press: [Ctrl+A] then [D]"
