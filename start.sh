#!/bin/bash

# Tweak Application Startup Script
# This script starts all components of the Tweak Application

echo "🚀 Starting Tweak Application..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if MariaDB is running
if ! pgrep -x "mysqld" > /dev/null; then
    echo "⚠️  MariaDB is not running. Please start MariaDB first."
    echo "   On Ubuntu/Debian: sudo systemctl start mariadb"
    echo "   On macOS: brew services start mariadb"
    exit 1
fi

# Function to start a service in background
start_service() {
    local service_name=$1
    local service_dir=$2
    local service_command=$3
    
    echo "📦 Starting $service_name..."
    cd "$service_dir"
    
    if [ ! -d "node_modules" ]; then
        echo "📥 Installing dependencies for $service_name..."
        npm install
    fi
    
    # Start service in background
    nohup $service_command > "../logs/${service_name}.log" 2>&1 &
    echo $! > "../logs/${service_name}.pid"
    echo "✅ $service_name started (PID: $(cat ../logs/${service_name}.pid))"
}

# Create logs directory
mkdir -p logs

# Start Backend
start_service "backend" "backend" "npm run dev"

# Wait a moment for backend to start
sleep 3

# Start Frontend
start_service "frontend" "frontend" "npm start"

echo ""
echo "🎉 Tweak Application started successfully!"
echo ""
echo "📊 Admin Dashboard: http://localhost:3000"
echo "🔗 Backend API: http://localhost:3001"
echo "📱 Desktop App: Run 'npm run dev' in desktop-app directory"
echo ""
echo "📋 Logs are available in the 'logs' directory"
echo "🛑 To stop all services, run: ./stop.sh"
echo ""
echo "Default admin credentials:"
echo "   Username: admin"
echo "   Password: admin123"