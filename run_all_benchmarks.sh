#!/bin/bash

# =============================================================================
# Run All Healthcare Benchmarks (1M, 10M, 100M)
# ClickHouse vs Elasticsearch - 12 Benchmarks x 3 Scales
# =============================================================================

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo "=============================================="
echo "  ClickHouse vs Elasticsearch Benchmarks"
echo "  Running all 12 benchmarks on 3 scales"
echo "=============================================="
echo ""

# Check if we're in the right directory
if [ ! -f "benchmarks/run_healthcare_benchmarks.py" ]; then
    echo -e "${RED}Error: run_healthcare_benchmarks.py not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is required${NC}"
    exit 1
fi

# Load environment variables
if [ -f "config.env" ]; then
    export $(grep -v '^#' config.env | xargs)
    echo -e "${GREEN}✓ Loaded config.env${NC}"
else
    echo -e "${YELLOW}Warning: config.env not found${NC}"
fi

# Create results directory if it doesn't exist
mkdir -p results

# Track timing
START_TIME=$(date +%s)

# Run 1M benchmarks
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}[1/3] Running Healthcare 1M Benchmarks${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
python3 benchmarks/run_healthcare_benchmarks.py --scale 1m --output results
echo -e "${GREEN}✓ Healthcare 1M complete${NC}"

# Run 10M benchmarks
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}[2/3] Running Healthcare 10M Benchmarks${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
python3 benchmarks/run_healthcare_benchmarks.py --scale 10m --output results
echo -e "${GREEN}✓ Healthcare 10M complete${NC}"

# Run 100M benchmarks
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}[3/3] Running Healthcare 100M Benchmarks${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
python3 benchmarks/run_healthcare_benchmarks.py --scale 100m --output results
echo -e "${GREEN}✓ Healthcare 100M complete${NC}"

# Calculate total time
END_TIME=$(date +%s)
TOTAL_TIME=$((END_TIME - START_TIME))
MINUTES=$((TOTAL_TIME / 60))
SECONDS=$((TOTAL_TIME % 60))

# Summary
echo ""
echo "=============================================="
echo -e "${GREEN}  All Benchmarks Complete!${NC}"
echo "=============================================="
echo ""
echo "Results saved to:"
echo "  • results/healthcare_1m_benchmark_results.json"
echo "  • results/healthcare_10m_benchmark_results.json"
echo "  • results/healthcare_100m_benchmark_results.json"
echo ""
echo -e "Total time: ${YELLOW}${MINUTES}m ${SECONDS}s${NC}"
echo ""
echo "To view results, start the web app:"
echo "  cd webapp/backend && source venv/bin/activate && python3 app.py"
echo "  cd webapp/frontend && npm start"
echo ""

