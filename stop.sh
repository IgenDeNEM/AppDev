#!/bin/bash

# Tweak Application Stop Script
# This script stops all components of the Tweak Application

echo "🛑 Stopping Tweak Application..."

# Function to stop a service
stop_service() {
    local service_name=$1
    local pid_file="logs/${service_name}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo "🛑 Stopping $service_name (PID: $pid)..."
            kill $pid
            rm "$pid_file"
            echo "✅ $service_name stopped"
        else
            echo "⚠️  $service_name was not running"
            rm "$pid_file"
        fi
    else
        echo "⚠️  No PID file found for $service_name"
    fi
}

# Stop services
stop_service "backend"
stop_service "frontend"

# Kill any remaining Node.js processes related to the project
echo "🧹 Cleaning up remaining processes..."
pkill -f "tweak" 2>/dev/null || true
pkill -f "backend/server.js" 2>/dev/null || true
pkill -f "frontend" 2>/dev/null || true

echo ""
echo "✅ All Tweak Application services have been stopped."
echo "📋 Logs are preserved in the 'logs' directory"