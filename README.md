# ClickHouse vs Elasticsearch Benchmarks

A comprehensive performance comparison between ClickHouse and Elasticsearch using healthcare data at three scales (1M, 10M, 100M rows).

## Prerequisites

- **Python 3.8+**
- **Node.js 16+** and npm
- **ClickHouse Cloud** account (or local instance)
- **Elasticsearch Cloud** account (or local instance)

## Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd DB-benchmarks

# Run the setup script
./setup.sh
# Select option 1 to setup everything (backend + frontend)
```

### 2. Configure Database Connections

Create a `.env` file in the project root with your database credentials:

```bash
# ClickHouse Cloud
CLICKHOUSE_HOST=your-clickhouse-host.clickhouse.cloud
CLICKHOUSE_PORT=9440
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=your-password
CLICKHOUSE_SECURE=true

# Elasticsearch Cloud
ELASTICSEARCH_SCHEME=https
ELASTICSEARCH_HOST=your-elasticsearch-host.es.cloud
ELASTICSEARCH_PORT=443
ELASTICSEARCH_USER=elastic
ELASTICSEARCH_PASSWORD=your-password
```

### 3. View Results Dashboard

```bash
./setup.sh
# Select option 4 to start both servers
```

Then open http://localhost:3000 in your browser.

## Running Benchmarks

### Using the Benchmark Runner Script

To run benchmarks against your own database instances:

```bash
# Make the script executable (first time only)
chmod +x run_benchmarks.sh

# Run benchmarks at different scales
./run_benchmarks.sh 1m      # 1 million rows
./run_benchmarks.sh 10m     # 10 million rows
./run_benchmarks.sh 100m    # 100 million rows

# Run specific category only
./run_benchmarks.sh 10m query       # Only query benchmarks
./run_benchmarks.sh 10m capability  # Only capability benchmarks
```

### Manual Benchmark Execution

```bash
cd benchmarks
source ../webapp/backend/venv/bin/activate  # Use existing venv

python run_healthcare_benchmarks.py --scale 1m
python run_healthcare_benchmarks.py --scale 10m --category query
python run_healthcare_benchmarks.py --scale 100m --output ../results
```

Results are saved to the `results/` directory as JSON files.

## Project Structure

```
DB-benchmarks/
├── README.md                 # This file
├── setup.sh                  # Interactive setup script
├── run_benchmarks.sh         # Simplified benchmark runner
├── .env                      # Database credentials (create this)
│
├── benchmarks/
│   └── run_healthcare_benchmarks.py  # Main benchmark script
│
├── results/                  # Benchmark results (JSON)
│   ├── healthcare_1m_benchmark_results.json
│   ├── healthcare_10m_benchmark_results.json
│   └── healthcare_100m_benchmark_results.json
│
├── webapp/
│   ├── backend/              # Flask API server
│   │   ├── app.py
│   │   └── requirements.txt
│   └── frontend/             # React dashboard
│       ├── src/
│       └── package.json
│
├── report/
│   └── main.tex              # LaTeX report
│
└── presentation/
    └── slides.tex            # LaTeX Beamer slides
```

## Benchmarks Overview

### Query Performance (5 benchmarks)
Both systems compete on these queries:

| Benchmark | Description |
|-----------|-------------|
| Simple Aggregation | GROUP BY with COUNT and AVG |
| Time-Series Analysis | Daily aggregation with date bucketing |
| Full-Text Search | Search for specific event types |
| Top-N Query | Find highest-cost events |
| Multi-Metric Dashboard | Complex aggregation with 6 metrics |

### Capability Comparison (3 benchmarks)
Operations Elasticsearch cannot perform:

| Benchmark | ES Limitation |
|-----------|---------------|
| Patient-Event JOIN | Cannot perform JOINs |
| Cost by Condition | Cannot join across tables |
| Anomaly Detection | Cannot execute subqueries |

## Key Results Summary

| Metric | ClickHouse | Elasticsearch |
|--------|------------|---------------|
| Query Performance | - | 8-24x faster |
| Data Ingestion | 23x faster | - |
| Storage Efficiency | 9.5x better | - |
| JOINs/Subqueries | Supported | Not possible |

## Webapp Usage

### Starting the Dashboard

```bash
./setup.sh
# Option 4: Start both servers
# Option 5: View results (backend only + open browser)
```

### Manual Start

Terminal 1 (Backend):
```bash
cd webapp/backend
source venv/bin/activate
python app.py
```

Terminal 2 (Frontend):
```bash
cd webapp/frontend
npm start
```

## Generating Reports

### PDF Presentation
```bash
cd presentation
pdflatex slides.tex
```

### Full Report
```bash
cd report
pdflatex main.tex
bibtex main
pdflatex main.tex
pdflatex main.tex
```

## Troubleshooting

### "Cannot connect to ClickHouse/Elasticsearch"
- Verify your `.env` credentials are correct
- Check that your IP is whitelisted in cloud console
- Ensure the database instances are running

### "Module not found" errors
```bash
cd webapp/backend
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend won't start
```bash
cd webapp/frontend
rm -rf node_modules
npm install
npm start
```

## Authors

- Karl Seryani
- Arik Dhaliwal
- Raghav Gulati

Database Systems - Fall 2025, Western University
