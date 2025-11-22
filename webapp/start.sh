#!/bin/bash

echo "Starting ClickHouse vs Elasticsearch Dashboard"
echo "=============================================="

# Start Flask backend
echo "Starting Flask backend on port 5000..."
cd backend
pip install -r requirements.txt > /dev/null 2>&1
python app.py &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 2

# Start React frontend
echo "Starting React frontend on port 3000..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "Dashboard is running!"
echo "  - Backend:  http://localhost:5000"
echo "  - Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Handle cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT

# Wait for both processes
wait
