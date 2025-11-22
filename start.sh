#!/bin/bash

# ClickHouse vs Elasticsearch - Full Stack Startup Script
# This script starts both the backend API and frontend React app

echo "🚀 Starting ClickHouse vs Elasticsearch Application..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Start Backend API
echo -e "${BLUE}Starting Backend API (Flask)...${NC}"
cd webapp/backend
python3 app.py &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID) on http://localhost:5002${NC}"
echo ""

# Wait a moment for backend to initialize
sleep 2

# Start Frontend
echo -e "${BLUE}Starting Frontend (React + Vite)...${NC}"
cd ../frontend
npm start &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
echo ""

echo "========================================="
echo "🎉 Application is running!"
echo "========================================="
echo "Frontend: http://localhost:5173"
echo "Backend API: http://localhost:5002"
echo ""
echo "Press Ctrl+C to stop all services"
echo "========================================="

# Trap Ctrl+C and kill both processes
trap "echo ''; echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT

# Wait for both processes
wait
