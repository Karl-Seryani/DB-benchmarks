# ClickHouse vs Elasticsearch Dashboard

Interactive presentation dashboard for the database comparison project.

## Quick Start

### Option 1: Use the startup script
```bash
cd webapp
chmod +x start.sh
./start.sh
```

### Option 2: Manual startup

**Terminal 1 - Backend:**
```bash
cd webapp/backend
pip install -r requirements.txt
python app.py
```

**Terminal 2 - Frontend:**
```bash
cd webapp/frontend
npm install  # first time only
npm start
```

## URLs
- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:5000

## Features

- **Interactive Charts**: Bar charts comparing query performance
- **Dataset Switching**: Toggle between Healthcare (160K) and NYC Taxi (3M) data
- **mpathic Callouts**: Context from the real-world case study
- **Comparison Panels**: Side-by-side mpathic vs our results
- **Storage Visualization**: 13.3x compression advantage
- **Benchmark Details**: All 7 benchmarks explained

## API Endpoints

- `GET /api/results/synthetic` - Healthcare benchmark results
- `GET /api/results/nyc` - NYC taxi benchmark results
- `GET /api/storage` - Storage efficiency comparison
- `GET /api/mpathic` - mpathic case study context
- `GET /api/benchmarks` - Benchmark descriptions

## Tech Stack

- **Frontend**: React + TypeScript + Recharts
- **Backend**: Flask + CORS
- **Styling**: Dark mode with ClickHouse orange / Elasticsearch teal
