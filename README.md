# ClickHouse vs Elasticsearch Comparison Project

## Project Overview
Comparative analysis of ClickHouse and Elasticsearch for analytical workloads using synthetic healthcare data.

## Project Structure
```
clickhouse-elasticsearch-comparison/
├── data/
│   ├── generate_datasets.py      # Data generator script
│   └── datasets/                  # Generated CSV/JSON files
├── benchmarks/
│   ├── clickhouse_tests.py       # ClickHouse performance tests
│   ├── elasticsearch_tests.py    # Elasticsearch performance tests
│   └── run_all_benchmarks.py     # Master benchmark runner
├── results/
│   ├── raw_results.json          # Raw benchmark data
│   └── visualizations/            # Charts and graphs
├── analysis/
│   ├── performance_analysis.ipynb # Jupyter notebook for analysis
│   └── security_comparison.md     # Security feature comparison
└── report/
    └── final_report.tex           # LaTeX final report
```

## Setup Instructions

### 1. Install Dependencies
```bash
pip install clickhouse-driver elasticsearch pandas matplotlib plotly jupyter
```

### 2. Generate Test Data
```bash
# Small test dataset (quick test)
cd data
python generate_datasets.py --size small --format csv

# Medium dataset (for development)
python generate_datasets.py --size medium --format csv

# Full dataset (for final benchmarks - WARNING: takes time!)
python generate_datasets.py --size full --format csv
```

### 3. Install Databases
- **ClickHouse**: [Installation Guide](https://clickhouse.com/docs/en/install)
- **Elasticsearch**: [Installation Guide](https://www.elastic.co/guide/en/elasticsearch/reference/current/install-elasticsearch.html)

## Datasets Generated

### Patients Table (1M records)
- patient_id, age, gender, primary_condition, registration_date, risk_score

### Medical Events Table (100M records)
- event_id, patient_id, event_type, department, timestamp, duration_minutes, severity, cost_usd

### IoT Telemetry Table (50M records)
- reading_id, device_id, patient_id, device_type, timestamp, value, unit, is_abnormal

## 7 Benchmark Tests

1. **Simple Aggregation** - Count and average on 10M rows
2. **Multi-Level GROUP BY** - Complex grouping on 50M rows
3. **JOIN Performance** - Join patients with events (1M × 100M)
4. **Time-Series Aggregation** - Rolling averages over 365 days
5. **Complex Analytical Query** - Top-N with filters on 100M rows
6. **Data Compression** - Storage efficiency comparison
7. **Concurrent Load** - 10 simultaneous queries

## Team Members
- Karl Seryani - 251-304-976
- Arik Dhaliwal - 251-289-250
- Raghav Gulati - [ID]

## Next Steps
1. ✅ Generate small test dataset
2. ⏳ Set up ClickHouse and Elasticsearch
3. ⏳ Implement benchmark scripts
4. ⏳ Run performance tests
5. ⏳ Analyze results and create visualizations
6. ⏳ Write final report
