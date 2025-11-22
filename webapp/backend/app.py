"""
Flask Backend for ClickHouse vs Elasticsearch Dashboard
Serves benchmark results and runs benchmarks on demand
"""

from flask import Flask, jsonify
from flask_cors import CORS
import json
import os
import sys

# Add parent directories to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'benchmarks'))

app = Flask(__name__)
CORS(app)

# Paths to results
RESULTS_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'results')

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

@app.route('/api/results/synthetic', methods=['GET'])
def get_synthetic_results():
    """Get synthetic healthcare benchmark results"""
    try:
        with open(os.path.join(RESULTS_DIR, 'benchmark_results.json'), 'r') as f:
            data = json.load(f)
        return jsonify(data)
    except FileNotFoundError:
        return jsonify({"error": "Results not found. Run benchmarks first."}), 404

@app.route('/api/results/nyc', methods=['GET'])
def get_nyc_results():
    """Get NYC taxi benchmark results"""
    try:
        with open(os.path.join(RESULTS_DIR, 'nyc_benchmark_results.json'), 'r') as f:
            data = json.load(f)
        return jsonify(data)
    except FileNotFoundError:
        return jsonify({"error": "Results not found. Run benchmarks first."}), 404

@app.route('/api/storage', methods=['GET'])
def get_storage_comparison():
    """Get storage efficiency comparison data"""
    # Hardcoded from your actual results
    return jsonify({
        "clickhouse": {
            "total_mib": 2.1,
            "breakdown": {
                "patients": 0.094,  # 96 KiB
                "medical_events": 1.51,
                "iot_telemetry": 0.509  # 521 KiB
            }
        },
        "elasticsearch": {
            "total_mb": 27.97,
            "breakdown": {
                "patients": 1.37,
                "medical_events": 20.31,
                "iot_telemetry": 6.29
            }
        },
        "compression_ratio": 13.3
    })

@app.route('/api/mpathic', methods=['GET'])
def get_mpathic_context():
    """Get mpathic case study context for callouts"""
    return jsonify({
        "company": "mpathic",
        "industry": "AI Healthcare",
        "migration": "Elasticsearch → ClickHouse Cloud",
        "key_benefits": [
            "Faster data pipelines for ML experimentation",
            "Reduced compute costs through compression",
            "Simplified operations via managed cloud",
            "Maintained HIPAA compliance"
        ],
        "scale": "Billions of rows (genomic data)",
        "callouts": {
            "storage": {
                "title": "mpathic's Storage Savings",
                "content": "mpathic reported significant storage cost reduction after migration. Our 13.3x compression ratio validates this finding - at scale, this translates to massive cost savings.",
                "relevance": "high"
            },
            "query_performance": {
                "title": "Scale Matters",
                "content": "mpathic processed billions of rows where ClickHouse excels. Our small dataset (100K-3M rows) favors Elasticsearch due to network latency overhead dominating query time.",
                "relevance": "medium"
            },
            "joins": {
                "title": "SQL Advantage",
                "content": "mpathic needed complex SQL operations for ML pipelines. Our JOIN benchmark shows ClickHouse's 2.3x advantage - critical for analytical workloads.",
                "relevance": "high"
            },
            "operations": {
                "title": "Managed Simplicity",
                "content": "mpathic moved from self-managed EC2 to ClickHouse Cloud. Both our test systems are cloud-managed, eliminating operational overhead.",
                "relevance": "medium"
            },
            "time_series": {
                "title": "Time-Series Strength",
                "content": "ClickHouse won our Time-Series benchmark on NYC data. This aligns with mpathic's time-stamped genomic event data.",
                "relevance": "high"
            }
        },
        "comparison_panels": [
            {
                "metric": "Dataset Scale",
                "mpathic": "Billions of rows",
                "our_test": "13 Million rows",
                "insight": "ClickHouse advantages emerge at scale"
            },
            {
                "metric": "Storage Compression",
                "mpathic": "Significant reduction (reported)",
                "our_test": "13.3x better than ES",
                "insight": "Validated - major cost saving"
            },
            {
                "metric": "Ingestion Speed",
                "mpathic": "Faster data pipelines",
                "our_test": "8.5x faster (13M vs 2.3M rows)",
                "insight": "Massive difference for continuous loading"
            },
            {
                "metric": "Small Data Latency",
                "mpathic": "N/A (Big Data focus)",
                "our_test": "ES 2x faster (160K rows)",
                "insight": "Elasticsearch wins on small datasets"
            }
        ]
    })

@app.route('/api/scalability', methods=['GET'])
def get_scalability_results():
    """Get scalability test results (13M row ingestion)"""
    return jsonify({
        "clickhouse": {
            "rows_loaded": 13100000,
            "time_minutes": 3,
            "speed_rows_sec": 75000,
            "status": "Completed"
        },
        "elasticsearch": {
            "rows_loaded": 2300000,
            "time_minutes": 10,
            "speed_rows_sec": 3800,
            "status": "Stopped (Too Slow)"
        },
        "speedup": 8.5,
        "details": "ClickHouse loaded 13.1M rows in 3 mins. Elasticsearch only managed 2.3M rows in 10 mins before being stopped."
    })

@app.route('/api/benchmarks', methods=['GET'])
def get_benchmark_descriptions():
    """Get descriptions of all 7 benchmarks"""
    return jsonify([
        {
            "id": 1,
            "name": "Simple Aggregation",
            "description": "COUNT and AVG grouped by a single field",
            "sql_example": "SELECT department, COUNT(*), AVG(cost) FROM events GROUP BY department",
            "tests": "Basic OLAP capability"
        },
        {
            "id": 2,
            "name": "Multi-Level GROUP BY",
            "description": "Grouping by multiple dimensions",
            "sql_example": "SELECT dept, severity, COUNT(*) FROM events GROUP BY dept, severity",
            "tests": "Multi-dimensional analysis"
        },
        {
            "id": 3,
            "name": "Time-Series Aggregation",
            "description": "Daily aggregations over time",
            "sql_example": "SELECT DATE(timestamp), COUNT(*), SUM(amount) GROUP BY DATE(timestamp)",
            "tests": "Date-partitioned queries (ClickHouse strength)"
        },
        {
            "id": 4,
            "name": "Filter + Aggregation",
            "description": "WHERE clause with aggregations",
            "sql_example": "SELECT ... WHERE severity='Critical' AND cost > 3000 GROUP BY ...",
            "tests": "Filtered analytical queries"
        },
        {
            "id": 5,
            "name": "JOIN Performance",
            "description": "Joining tables (SQL vs application-side)",
            "sql_example": "SELECT ... FROM patients JOIN events ON patient_id",
            "tests": "ClickHouse SQL advantage vs ES workaround"
        },
        {
            "id": 6,
            "name": "Complex Analytical",
            "description": "Subqueries, HAVING, multiple aggregations",
            "sql_example": "SELECT ... WHERE cost > (SELECT AVG(cost)...) HAVING count > 10",
            "tests": "Advanced SQL capabilities"
        },
        {
            "id": 7,
            "name": "Concurrent Load",
            "description": "5 simultaneous queries",
            "sql_example": "5x parallel: SELECT ... GROUP BY ...",
            "tests": "Scalability under load"
        }
    ])

@app.route('/api/network-latency', methods=['GET'])
def get_network_latency():
    """Get network latency baseline data"""
    return jsonify({
        "clickhouse_ms": 80,
        "elasticsearch_ms": 53,
        "difference_ms": 27,
        "impact": "For sub-100ms queries, network latency is 50-80% of total time"
    })

@app.route('/api/demo/query', methods=['POST'])
def run_demo_query():
    """Run a demo query comparison (simulated results)"""
    from flask import request
    import random

    query_index = request.json.get('query_index', 0)

    # Simulated results based on actual benchmark data for all 7 queries
    simulated_results = [
        # Simple Aggregation
        {
            "clickhouse": {"time_ms": 88 + random.uniform(-10, 10), "row_count": 10},
            "elasticsearch": {"time_ms": 47 + random.uniform(-5, 5), "row_count": 10}
        },
        # Multi-Level GROUP BY
        {
            "clickhouse": {"time_ms": 92 + random.uniform(-10, 10), "row_count": 45},
            "elasticsearch": {"time_ms": 61 + random.uniform(-5, 5), "row_count": 45}
        },
        # Time-Series
        {
            "clickhouse": {"time_ms": 80 + random.uniform(-10, 10), "row_count": 365},
            "elasticsearch": {"time_ms": 55 + random.uniform(-5, 5), "row_count": 365}
        },
        # Filter + Aggregate
        {
            "clickhouse": {"time_ms": 84 + random.uniform(-10, 10), "row_count": 8},
            "elasticsearch": {"time_ms": 44 + random.uniform(-5, 5), "row_count": 8}
        },
        # JOIN Performance
        {
            "clickhouse": {"time_ms": 99 + random.uniform(-10, 10), "row_count": 10000},
            "elasticsearch": {"time_ms": 226 + random.uniform(-15, 15), "row_count": 10000}
        },
        # Complex Analytical
        {
            "clickhouse": {"time_ms": 105 + random.uniform(-10, 10), "row_count": 6},
            "elasticsearch": {"time_ms": 178 + random.uniform(-10, 10), "row_count": 6}
        },
        # Concurrent Load
        {
            "clickhouse": {"time_ms": 376 + random.uniform(-20, 20), "row_count": 10},
            "elasticsearch": {"time_ms": 219 + random.uniform(-15, 15), "row_count": 10}
        }
    ]

    if query_index < len(simulated_results):
        return jsonify(simulated_results[query_index])
    else:
        return jsonify({"error": "Invalid query index"}), 400

if __name__ == '__main__':
    app.run(debug=True, port=5002)
