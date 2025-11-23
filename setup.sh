#!/bin/bash

# DB Benchmarks Project - Quick Start Script
# ClickHouse vs Elasticsearch Comparison

set -e  # Exit on error

echo "============================================"
echo " ClickHouse vs Elasticsearch Benchmarks"
echo " Quick Start Setup"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for Python
echo "Checking prerequisites..."
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is required but not installed.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Python 3 found${NC}"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is required but not installed.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js found${NC}"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is required but not installed.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm found${NC}"

echo ""
echo "Select what you want to do:"
echo "1) Setup everything (backend + frontend)"
echo "2) Setup backend only"
echo "3) Setup frontend only"
echo "4) Start servers (requires setup first)"
echo "5) View results (start backend + open dashboard)"
read -p "Enter choice [1-5]: " choice

case $choice in
    1)
        echo ""
        echo "Setting up backend..."
        cd webapp/backend
        if [ ! -d "venv" ]; then
            python3 -m venv venv
            echo -e "${GREEN}✅ Virtual environment created${NC}"
        fi
        source venv/bin/activate
        pip install -r requirements.txt > /dev/null 2>&1
        echo -e "${GREEN}✅ Backend dependencies installed${NC}"
        cd ../..

        echo ""
        echo "Setting up frontend..."
        cd webapp/frontend
        if [ ! -d "node_modules" ]; then
            npm install > /dev/null 2>&1
            echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
        else
            echo -e "${YELLOW}⚠️  node_modules exists, skipping install${NC}"
        fi
        cd ../..

        echo ""
        echo -e "${GREEN}✅ Setup complete!${NC}"
        echo ""
        echo "Next steps:"
        echo "  ./start.sh    # To start both servers"
        ;;
    
    2)
        echo ""
        echo "Setting up backend..."
        cd webapp/backend
        if [ ! -d "venv" ]; then
            python3 -m venv venv
            echo -e "${GREEN}✅ Virtual environment created${NC}"
        fi
        source venv/bin/activate
        pip install -r requirements.txt
        echo -e "${GREEN}✅ Backend dependencies installed${NC}"
        cd ../..
        
        echo ""
        echo "To start backend: cd webapp/backend && source venv/bin/activate && python3 app.py"
        ;;
    
    3)
        echo ""
        echo "Setting up frontend..."
        cd webapp/frontend
        npm install
        echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
        cd ../..
        
        echo ""
        echo "To start frontend: cd webapp/frontend && npm start"
        ;;
    
    4)
        echo ""
        echo "Starting backend server..."
        cd webapp/backend
        if [ ! -d "venv" ]; then
            echo -e "${RED}❌ Backend not setup. Run option 1 or 2 first.${NC}"
            exit 1
        fi
        source venv/bin/activate
        python3 app.py &
        BACKEND_PID=$!
        cd ../..
        
        echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
        echo "   API running at http://localhost:5002"
        
        sleep 2
        
        echo ""
        echo "Starting frontend server..."
        cd webapp/frontend
        if [ ! -d "node_modules" ]; then
            echo -e "${RED}❌ Frontend not setup. Run option 1 or 3 first.${NC}"
            kill $BACKEND_PID
            exit 1
        fi
        npm start &
        FRONTEND_PID=$!
        cd ../..
        
        echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
        echo "   Dashboard will open at http://localhost:3000"
        echo ""
        echo "Press Ctrl+C to stop both servers"
        
        # Wait for Ctrl+C
        trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
        wait
        ;;
    
    5)
        echo ""
        echo "Starting backend server..."
        cd webapp/backend
        if [ ! -d "venv" ]; then
            echo -e "${RED}❌ Backend not setup. Run option 1 or 2 first.${NC}"
            exit 1
        fi
        source venv/bin/activate
        python3 app.py > /dev/null 2>&1 &
        BACKEND_PID=$!
        cd ../..
        
        echo -e "${GREEN}✅ Backend started${NC}"
        echo "   Waiting for server to be ready..."
        sleep 3
        
        # Test if backend is running
        if curl -s http://localhost:5002/api/health > /dev/null; then
            echo -e "${GREEN}✅ Backend is healthy${NC}"
            echo ""
            echo "Opening presentation..."
            open presentation_slides.html
            echo ""
            echo "Opening dashboard in browser..."
            sleep 2
            open http://localhost:3000 || xdg-open http://localhost:3000 || echo "Please open http://localhost:3000 manually"
        else
            echo -e "${RED}❌ Backend failed to start${NC}"
            kill $BACKEND_PID
            exit 1
        fi
        
        echo ""
        echo "Press Ctrl+C to stop the backend server"
        trap "kill $BACKEND_PID; exit" INT
        wait $BACKEND_PID
        ;;
    
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo "============================================"
echo " Done!"
echo "============================================"

