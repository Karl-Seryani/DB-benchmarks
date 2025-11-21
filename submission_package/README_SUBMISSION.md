# Database Systems Project: ClickHouse vs Elasticsearch
**Student:** Karl Seryani
**Date:** November 21, 2025

## Project Overview
This project benchmarks ClickHouse and Elasticsearch for healthcare analytics workloads, using both synthetic data (100K rows) and real-world NYC Taxi data (3M rows).

## Folder Structure
- `src/`: Source code for data generation, loading, and benchmarking.
- `results/`: JSON output of benchmark runs and analysis documents.
- `report/`: LaTeX source for the final report.

## Key Findings
1. **Storage:** ClickHouse is 13.3x more storage efficient.
2. **Ingestion:** ClickHouse loads data 8.5x faster.
3. **Querying:** Elasticsearch is faster for simple lookups; ClickHouse wins on complex analytical queries (JOINs).

## How to Run
1. Install dependencies: `pip install -r requirements.txt`
2. Run benchmarks: `python3 src/benchmarks/run_benchmarks.py`