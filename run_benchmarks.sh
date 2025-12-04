#!/bin/bash

# ClickHouse vs Elasticsearch Benchmark Runner
# Simplified script for running benchmarks

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
    echo ""
    echo "Usage: ./run_benchmarks.sh <scale> [category]"
    echo ""
    echo "Arguments:"
    echo "  scale     Required. Dataset size: 1m, 10m, or 100m"
    echo "  category  Optional. Benchmark category: all, query, or capability"
    echo "            Default: all"
    echo ""
    echo "Examples:"
    echo "  ./run_benchmarks.sh 1m            # Run all benchmarks on 1M dataset"
    echo "  ./run_benchmarks.sh 10m query     # Run only query benchmarks on 10M"
    echo "  ./run_benchmarks.sh 100m capability  # Run only capability benchmarks on 100M"
    echo ""
    exit 1
}

# Check arguments
if [ -z "$1" ]; then
    echo -e "${RED}Error: Scale argument is required${NC}"
    usage
fi

SCALE=$1
CATEGORY=${2:-all}

# Validate scale
if [[ ! "$SCALE" =~ ^(1m|10m|100m)$ ]]; then
    echo -e "${RED}Error: Invalid scale '$SCALE'. Must be 1m, 10m, or 100m${NC}"
    usage
fi

# Validate category
if [[ ! "$CATEGORY" =~ ^(all|query|capability)$ ]]; then
    echo -e "${RED}Error: Invalid category '$CATEGORY'. Must be all, query, or capability${NC}"
    usage
fi

echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN} ClickHouse vs Elasticsearch Benchmarks${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""
echo -e "Scale:    ${GREEN}$SCALE${NC}"
echo -e "Category: ${GREEN}$CATEGORY${NC}"
echo ""

# Check for .env file
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo -e "${YELLOW}Warning: No .env file found in project root${NC}"
    echo "Create a .env file with your database credentials:"
    echo ""
    echo "  CLICKHOUSE_HOST=your-host"
    echo "  CLICKHOUSE_PORT=9440"
    echo "  CLICKHOUSE_USER=default"
    echo "  CLICKHOUSE_PASSWORD=your-password"
    echo "  CLICKHOUSE_SECURE=true"
    echo ""
    echo "  ELASTICSEARCH_SCHEME=https"
    echo "  ELASTICSEARCH_HOST=your-host"
    echo "  ELASTICSEARCH_PORT=443"
    echo "  ELASTICSEARCH_USER=elastic"
    echo "  ELASTICSEARCH_PASSWORD=your-password"
    echo ""
    read -p "Continue anyway? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check for Python virtual environment
VENV_PATH="$SCRIPT_DIR/webapp/backend/venv"
if [ ! -d "$VENV_PATH" ]; then
    echo -e "${YELLOW}Virtual environment not found. Creating...${NC}"
    python3 -m venv "$VENV_PATH"
    source "$VENV_PATH/bin/activate"
    pip install -r "$SCRIPT_DIR/webapp/backend/requirements.txt"
    pip install python-dotenv clickhouse-driver elasticsearch
    echo -e "${GREEN}✅ Virtual environment created${NC}"
else
    source "$VENV_PATH/bin/activate"
fi

# Copy .env to benchmarks directory if it exists
if [ -f "$SCRIPT_DIR/.env" ]; then
    cp "$SCRIPT_DIR/.env" "$SCRIPT_DIR/benchmarks/.env" 2>/dev/null || true
fi

# Run benchmarks
echo ""
echo -e "${CYAN}Running benchmarks...${NC}"
echo ""

cd "$SCRIPT_DIR/benchmarks"

python run_healthcare_benchmarks.py \
    --scale "$SCALE" \
    --category "$CATEGORY" \
    --output "$SCRIPT_DIR/results"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN} Benchmarks Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Results saved to: $SCRIPT_DIR/results/healthcare_${SCALE}_benchmark_results.json"
echo ""
echo "To view results in the dashboard:"
echo "  ./setup.sh  (select option 4 or 5)"
echo ""
