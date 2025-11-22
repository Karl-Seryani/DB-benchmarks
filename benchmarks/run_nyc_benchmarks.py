"""
Benchmark Suite: ClickHouse vs Elasticsearch
Tests query performance on NYC Taxi dataset (12 Million Rows - Jan-Apr 2024)
Same 7 benchmarks as healthcare data for consistent comparison
"""

import os
import time
import json
import threading
from datetime import datetime
from clickhouse_driver import Client as ClickHouseClient
from elasticsearch import Elasticsearch
from dotenv import load_dotenv

# Load environment variables
load_dotenv("../config.env")

# Results storage
results = {
    "test_date": datetime.now().isoformat(),
    "dataset": "NYC Taxi (12M rows)",
    "benchmarks": []
}

def get_clickhouse_client():
    """Create ClickHouse client"""
    return ClickHouseClient(
        host=os.getenv('CLICKHOUSE_HOST'),
        port=int(os.getenv('CLICKHOUSE_PORT', '9440')),
        user=os.getenv('CLICKHOUSE_USER', 'default'),
        password=os.getenv('CLICKHOUSE_PASSWORD'),
        secure=os.getenv('CLICKHOUSE_SECURE', 'true').lower() == 'true'
    )

def get_elasticsearch_client():
    """Create Elasticsearch client"""
    host = os.getenv('ELASTICSEARCH_HOST')
    port = int(os.getenv('ELASTICSEARCH_PORT', '443'))
    scheme = os.getenv('ELASTICSEARCH_SCHEME', 'https')

    return Elasticsearch(
        [f"{scheme}://{host}:{port}"],
        basic_auth=(
            os.getenv('ELASTICSEARCH_USER'),
            os.getenv('ELASTICSEARCH_PASSWORD')
        ),
        verify_certs=True,
        request_timeout=300
    )

def benchmark_clickhouse(name, query, runs=5):
    """Run benchmark on ClickHouse"""
    client = get_clickhouse_client()
    times = []

    for i in range(runs):
        start = time.time()
        result = client.execute(query)
        end = time.time()
        times.append((end - start) * 1000)

    avg_time = sum(times) / len(times)
    min_time = min(times)
    max_time = max(times)

    return {
        "system": "ClickHouse",
        "benchmark": name,
        "avg_ms": round(avg_time, 2),
        "min_ms": round(min_time, 2),
        "max_ms": round(max_time, 2),
        "runs": runs
    }

def benchmark_elasticsearch(name, index, query_body, runs=5):
    """Run benchmark on Elasticsearch"""
    es = get_elasticsearch_client()
    times = []

    for i in range(runs):
        start = time.time()
        result = es.search(index=index, body=query_body)
        end = time.time()
        times.append((end - start) * 1000)

    avg_time = sum(times) / len(times)
    min_time = min(times)
    max_time = max(times)

    return {
        "system": "Elasticsearch",
        "benchmark": name,
        "avg_ms": round(avg_time, 2),
        "min_ms": round(min_time, 2),
        "max_ms": round(max_time, 2),
        "runs": runs,
        "result_count": result['hits']['total']['value'] if 'hits' in result else 0
    }

def check_dataset_sizes():
    """Print the number of rows/docs in each system"""
    print("\n" + "="*60)
    print("  DATASET SIZE CHECK")
    print("="*60)
    
    # ClickHouse count
    try:
        ch_client = get_clickhouse_client()
        ch_count = ch_client.execute("SELECT COUNT(*) FROM healthcare_benchmark.nyc_taxi")[0][0]
        print(f"ClickHouse:    {ch_count:,} rows")
    except Exception as e:
        print(f"ClickHouse:    Error ({e})")
        ch_count = 0

    # Elasticsearch count
    try:
        es = get_elasticsearch_client()
        es_count = es.count(index="nyc_taxi")['count']
        print(f"Elasticsearch: {es_count:,} docs")
    except Exception as e:
        print(f"Elasticsearch: Error ({e})")
        es_count = 0
        
    print("="*60 + "\n")
    return ch_count, es_count


# ============================================================
# BENCHMARK 1: Simple Aggregation (COUNT + AVG)
# ============================================================

def benchmark_1_simple_aggregation():
    """Count trips and average fare by passenger count"""
    print("\n" + "="*60)
    print("Benchmark 1: Simple Aggregation (COUNT, AVG, GROUP BY)")
    print("="*60)

    # ClickHouse query
    ch_query = """
        SELECT
            passenger_count,
            COUNT(*) as trip_count,
            ROUND(AVG(fare_amount), 2) as avg_fare
        FROM healthcare_benchmark.nyc_taxi
        GROUP BY passenger_count
        ORDER BY trip_count DESC
    """

    ch_result = benchmark_clickhouse("Simple Aggregation", ch_query)
    print(f"ClickHouse: {ch_result['avg_ms']} ms (avg)")

    # Elasticsearch query
    es_query = {
        "size": 0,
        "aggs": {
            "by_passenger": {
                "terms": {"field": "passenger_count", "size": 100},
                "aggs": {
                    "avg_fare": {"avg": {"field": "fare_amount"}}
                }
            }
        }
    }

    es_result = benchmark_elasticsearch("Simple Aggregation", "nyc_taxi", es_query)
    print(f"Elasticsearch: {es_result['avg_ms']} ms (avg)")

    # Determine winner
    if ch_result['avg_ms'] < es_result['avg_ms']:
        speedup = es_result['avg_ms'] / ch_result['avg_ms']
        print(f"\n🏆 ClickHouse is {speedup:.1f}x faster")
    else:
        speedup = ch_result['avg_ms'] / es_result['avg_ms']
        print(f"\n🏆 Elasticsearch is {speedup:.1f}x faster")

    results["benchmarks"].extend([ch_result, es_result])

# ============================================================
# BENCHMARK 2: Multi-Level GROUP BY
# ============================================================

def benchmark_2_multilevel_groupby():
    """Group by multiple dimensions"""
    print("\n" + "="*60)
    print("Benchmark 2: Multi-Level GROUP BY (payment_type + passenger_count)")
    print("="*60)

    # ClickHouse query
    ch_query = """
        SELECT
            payment_type,
            passenger_count,
            COUNT(*) as count,
            ROUND(AVG(total_amount), 2) as avg_total
        FROM healthcare_benchmark.nyc_taxi
        GROUP BY payment_type, passenger_count
        ORDER BY count DESC
        LIMIT 20
    """

    ch_result = benchmark_clickhouse("Multi-Level GROUP BY", ch_query)
    print(f"ClickHouse: {ch_result['avg_ms']} ms (avg)")

    # Elasticsearch query
    es_query = {
        "size": 0,
        "aggs": {
            "by_payment": {
                "terms": {"field": "payment_type", "size": 10},
                "aggs": {
                    "by_passenger": {
                        "terms": {"field": "passenger_count", "size": 10},
                        "aggs": {
                            "avg_total": {"avg": {"field": "total_amount"}}
                        }
                    }
                }
            }
        }
    }

    es_result = benchmark_elasticsearch("Multi-Level GROUP BY", "nyc_taxi", es_query)
    print(f"Elasticsearch: {es_result['avg_ms']} ms (avg)")

    # Determine winner
    if ch_result['avg_ms'] < es_result['avg_ms']:
        speedup = es_result['avg_ms'] / ch_result['avg_ms']
        print(f"\n🏆 ClickHouse is {speedup:.1f}x faster")
    else:
        speedup = ch_result['avg_ms'] / es_result['avg_ms']
        print(f"\n🏆 Elasticsearch is {speedup:.1f}x faster")

    results["benchmarks"].extend([ch_result, es_result])

# ============================================================
# BENCHMARK 3: Time-Series Aggregation
# ============================================================

def benchmark_3_timeseries():
    """Daily trip counts and revenue over time"""
    print("\n" + "="*60)
    print("Benchmark 3: Time-Series Aggregation (daily counts)")
    print("="*60)

    # ClickHouse query
    ch_query = """
        SELECT
            toDate(tpep_pickup_datetime) as date,
            COUNT(*) as trips,
            ROUND(SUM(total_amount), 2) as total_revenue
        FROM healthcare_benchmark.nyc_taxi
        GROUP BY date
        ORDER BY date
    """

    ch_result = benchmark_clickhouse("Time-Series Aggregation", ch_query)
    print(f"ClickHouse: {ch_result['avg_ms']} ms (avg)")

    # Elasticsearch query
    es_query = {
        "size": 0,
        "aggs": {
            "by_date": {
                "date_histogram": {
                    "field": "tpep_pickup_datetime",
                    "calendar_interval": "day"
                },
                "aggs": {
                    "total_revenue": {"sum": {"field": "total_amount"}}
                }
            }
        }
    }

    es_result = benchmark_elasticsearch("Time-Series Aggregation", "nyc_taxi", es_query)
    print(f"Elasticsearch: {es_result['avg_ms']} ms (avg)")

    # Determine winner
    if ch_result['avg_ms'] < es_result['avg_ms']:
        speedup = es_result['avg_ms'] / ch_result['avg_ms']
        print(f"\n🏆 ClickHouse is {speedup:.1f}x faster")
    else:
        speedup = ch_result['avg_ms'] / es_result['avg_ms']
        print(f"\n🏆 Elasticsearch is {speedup:.1f}x faster")

    results["benchmarks"].extend([ch_result, es_result])

# ============================================================
# BENCHMARK 4: Filter + Aggregation
# ============================================================

def benchmark_4_filter_aggregation():
    """Filter long trips with high fare and aggregate"""
    print("\n" + "="*60)
    print("Benchmark 4: Filter + Aggregation (Long trips > 10 miles, fare > $30)")
    print("="*60)

    # ClickHouse query
    ch_query = """
        SELECT
            PULocationID,
            COUNT(*) as trip_count,
            ROUND(AVG(fare_amount), 2) as avg_fare,
            ROUND(MAX(fare_amount), 2) as max_fare
        FROM healthcare_benchmark.nyc_taxi
        WHERE trip_distance > 10 AND fare_amount > 30
        GROUP BY PULocationID
        ORDER BY trip_count DESC
        LIMIT 20
    """

    ch_result = benchmark_clickhouse("Filter + Aggregation", ch_query)
    print(f"ClickHouse: {ch_result['avg_ms']} ms (avg)")

    # Elasticsearch query
    es_query = {
        "query": {
            "bool": {
                "must": [
                    {"range": {"trip_distance": {"gt": 10}}},
                    {"range": {"fare_amount": {"gt": 30}}}
                ]
            }
        },
        "size": 0,
        "aggs": {
            "by_pickup": {
                "terms": {"field": "PULocationID", "size": 20},
                "aggs": {
                    "avg_fare": {"avg": {"field": "fare_amount"}},
                    "max_fare": {"max": {"field": "fare_amount"}}
                }
            }
        }
    }

    es_result = benchmark_elasticsearch("Filter + Aggregation", "nyc_taxi", es_query)
    print(f"Elasticsearch: {es_result['avg_ms']} ms (avg)")

    # Determine winner
    if ch_result['avg_ms'] < es_result['avg_ms']:
        speedup = es_result['avg_ms'] / ch_result['avg_ms']
        print(f"\n🏆 ClickHouse is {speedup:.1f}x faster")
    else:
        speedup = ch_result['avg_ms'] / es_result['avg_ms']
        print(f"\n🏆 Elasticsearch is {speedup:.1f}x faster")

    results["benchmarks"].extend([ch_result, es_result])

# ============================================================
# BENCHMARK 5: JOIN Performance (Self-JOIN for route analysis)
# ============================================================

def benchmark_5_join_performance():
    """Analyze routes by joining pickup to dropoff locations"""
    print("\n" + "="*60)
    print("Benchmark 5: JOIN Performance (Route Analysis)")
    print("="*60)

    # ClickHouse query - aggregate by route (pickup-dropoff pair)
    ch_query = """
        SELECT
            PULocationID,
            DOLocationID,
            COUNT(*) as trip_count,
            ROUND(AVG(trip_distance), 2) as avg_distance,
            ROUND(AVG(fare_amount), 2) as avg_fare
        FROM healthcare_benchmark.nyc_taxi
        WHERE trip_distance > 5
        GROUP BY PULocationID, DOLocationID
        ORDER BY trip_count DESC
        LIMIT 20
    """

    ch_result = benchmark_clickhouse("JOIN Performance", ch_query)
    print(f"ClickHouse: {ch_result['avg_ms']} ms (avg)")

    # Elasticsearch - composite aggregation for route analysis
    es = get_elasticsearch_client()
    times = []

    for i in range(5):
        start = time.time()

        es_query = {
            "size": 0,
            "query": {
                "range": {"trip_distance": {"gt": 5}}
            },
            "aggs": {
                "routes": {
                    "composite": {
                        "size": 1000,
                        "sources": [
                            {"pickup": {"terms": {"field": "PULocationID"}}},
                            {"dropoff": {"terms": {"field": "DOLocationID"}}}
                        ]
                    },
                    "aggs": {
                        "avg_distance": {"avg": {"field": "trip_distance"}},
                        "avg_fare": {"avg": {"field": "fare_amount"}}
                    }
                }
            }
        }

        result = es.search(index='nyc_taxi', body=es_query)
        end = time.time()
        times.append((end - start) * 1000)

    avg_time = sum(times) / len(times)
    es_result = {
        "system": "Elasticsearch",
        "benchmark": "JOIN Performance",
        "avg_ms": round(avg_time, 2),
        "min_ms": round(min(times), 2),
        "max_ms": round(max(times), 2),
        "runs": 5
    }
    print(f"Elasticsearch: {es_result['avg_ms']} ms (avg)")

    # Determine winner
    if ch_result['avg_ms'] < es_result['avg_ms']:
        speedup = es_result['avg_ms'] / ch_result['avg_ms']
        print(f"\n🏆 ClickHouse is {speedup:.1f}x faster")
    else:
        speedup = ch_result['avg_ms'] / es_result['avg_ms']
        print(f"\n🏆 Elasticsearch is {speedup:.1f}x faster")

    results["benchmarks"].extend([ch_result, es_result])

# ============================================================
# BENCHMARK 6: Complex Analytical Query
# ============================================================

def benchmark_6_complex_analytical():
    """Complex query with multiple aggregations and filters"""
    print("\n" + "="*60)
    print("Benchmark 6: Complex Analytical Query")
    print("="*60)

    # ClickHouse query - complex with subquery
    ch_query = """
        SELECT
            PULocationID,
            payment_type,
            COUNT(*) as total_trips,
            ROUND(AVG(fare_amount), 2) as avg_fare,
            ROUND(AVG(trip_distance), 2) as avg_distance,
            ROUND(AVG(tip_amount), 2) as avg_tip,
            COUNT(DISTINCT DOLocationID) as unique_destinations
        FROM healthcare_benchmark.nyc_taxi
        WHERE fare_amount > (
            SELECT AVG(fare_amount) FROM healthcare_benchmark.nyc_taxi
        )
        GROUP BY PULocationID, payment_type
        HAVING total_trips > 100
        ORDER BY avg_fare DESC
        LIMIT 20
    """

    ch_result = benchmark_clickhouse("Complex Analytical Query", ch_query)
    print(f"ClickHouse: {ch_result['avg_ms']} ms (avg)")

    # Elasticsearch - complex aggregation (approximate avg filter)
    es_query = {
        "size": 0,
        "query": {
            "range": {"fare_amount": {"gte": 15}}  # Approximate avg
        },
        "aggs": {
            "by_pickup": {
                "terms": {"field": "PULocationID", "size": 50},
                "aggs": {
                    "by_payment": {
                        "terms": {"field": "payment_type", "size": 10},
                        "aggs": {
                            "avg_fare": {"avg": {"field": "fare_amount"}},
                            "avg_distance": {"avg": {"field": "trip_distance"}},
                            "avg_tip": {"avg": {"field": "tip_amount"}},
                            "unique_destinations": {"cardinality": {"field": "DOLocationID"}}
                        }
                    }
                }
            }
        }
    }

    es_result = benchmark_elasticsearch("Complex Analytical Query", "nyc_taxi", es_query)
    print(f"Elasticsearch: {es_result['avg_ms']} ms (avg)")

    # Determine winner
    if ch_result['avg_ms'] < es_result['avg_ms']:
        speedup = es_result['avg_ms'] / ch_result['avg_ms']
        print(f"\n🏆 ClickHouse is {speedup:.1f}x faster")
    else:
        speedup = ch_result['avg_ms'] / es_result['avg_ms']
        print(f"\n🏆 Elasticsearch is {speedup:.1f}x faster")

    results["benchmarks"].extend([ch_result, es_result])

# ============================================================
# BENCHMARK 7: Concurrent Query Load
# ============================================================

def benchmark_7_concurrent_load():
    """Test performance under concurrent query load"""
    print("\n" + "="*60)
    print("Benchmark 7: Concurrent Query Load (5 simultaneous queries)")
    print("="*60)

    # Simple aggregation query for concurrent testing
    ch_query = """
        SELECT
            PULocationID,
            COUNT(*) as count,
            AVG(fare_amount) as avg_fare
        FROM healthcare_benchmark.nyc_taxi
        GROUP BY PULocationID
    """

    # ClickHouse concurrent test
    print("Testing ClickHouse with 5 concurrent queries...")
    ch_times = []

    for run in range(3):
        start = time.time()
        threads = []

        def run_ch_query():
            client = get_clickhouse_client()
            client.execute(ch_query)

        for i in range(5):
            t = threading.Thread(target=run_ch_query)
            threads.append(t)
            t.start()

        for t in threads:
            t.join()

        end = time.time()
        ch_times.append((end - start) * 1000)

    ch_avg = sum(ch_times) / len(ch_times)
    ch_result = {
        "system": "ClickHouse",
        "benchmark": "Concurrent Load",
        "avg_ms": round(ch_avg, 2),
        "min_ms": round(min(ch_times), 2),
        "max_ms": round(max(ch_times), 2),
        "runs": 3
    }
    print(f"ClickHouse: {ch_result['avg_ms']} ms (avg for 5 concurrent queries)")

    # Elasticsearch concurrent test
    print("Testing Elasticsearch with 5 concurrent queries...")

    es_query = {
        "size": 0,
        "aggs": {
            "by_pickup": {
                "terms": {"field": "PULocationID", "size": 300},
                "aggs": {
                    "avg_fare": {"avg": {"field": "fare_amount"}}
                }
            }
        }
    }

    es_times = []

    for run in range(3):
        start = time.time()
        threads = []

        def run_es_query():
            es = get_elasticsearch_client()
            es.search(index='nyc_taxi', body=es_query)

        for i in range(5):
            t = threading.Thread(target=run_es_query)
            threads.append(t)
            t.start()

        for t in threads:
            t.join()

        end = time.time()
        es_times.append((end - start) * 1000)

    es_avg = sum(es_times) / len(es_times)
    es_result = {
        "system": "Elasticsearch",
        "benchmark": "Concurrent Load",
        "avg_ms": round(es_avg, 2),
        "min_ms": round(min(es_times), 2),
        "max_ms": round(max(es_times), 2),
        "runs": 3
    }
    print(f"Elasticsearch: {es_result['avg_ms']} ms (avg for 5 concurrent queries)")

    # Determine winner
    if ch_result['avg_ms'] < es_result['avg_ms']:
        speedup = es_result['avg_ms'] / ch_result['avg_ms']
        print(f"\n🏆 ClickHouse is {speedup:.1f}x faster under concurrent load")
    else:
        speedup = ch_result['avg_ms'] / es_result['avg_ms']
        print(f"\n🏆 Elasticsearch is {speedup:.1f}x faster under concurrent load")

    results["benchmarks"].extend([ch_result, es_result])

# ============================================================
# Run All Benchmarks
# ============================================================

def main():
    """Run all benchmarks and generate report"""
    print("\n" + "="*60)
    print("  CLICKHOUSE VS ELASTICSEARCH BENCHMARK SUITE")
    print("  NYC Taxi Analytics Performance Comparison (3M rows)")
    print("="*60)
    
    check_dataset_sizes()

    try:
        benchmark_1_simple_aggregation()
        benchmark_2_multilevel_groupby()
        benchmark_3_timeseries()
        benchmark_4_filter_aggregation()
        benchmark_5_join_performance()
        benchmark_6_complex_analytical()
        benchmark_7_concurrent_load()

        # Summary
        print("\n" + "="*60)
        print("  BENCHMARK SUMMARY")
        print("="*60)

        # Print comparison table
        print(f"\n{'Benchmark':<30} | {'ClickHouse (ms)':<15} | {'Elasticsearch (ms)':<18} | {'Winner':<15}")
        print("-" * 85)

        benchmarks = [
            "Simple Aggregation",
            "Multi-Level GROUP BY",
            "Time-Series Aggregation",
            "Filter + Aggregation",
            "JOIN Performance",
            "Complex Analytical Query",
            "Concurrent Load"
        ]

        for b in benchmarks:
            ch = next((r for r in results["benchmarks"] if r['system'] == "ClickHouse" and r['benchmark'] == b), None)
            es = next((r for r in results["benchmarks"] if r['system'] == "Elasticsearch" and r['benchmark'] == b), None)

            if ch and es:
                if ch['avg_ms'] < es['avg_ms']:
                    winner = f"CH ({es['avg_ms']/ch['avg_ms']:.1f}x)"
                else:
                    winner = f"ES ({ch['avg_ms']/es['avg_ms']:.1f}x)"

                print(f"{b:<30} | {ch['avg_ms']:<15} | {es['avg_ms']:<18} | {winner:<15}")

        # Save results
        with open('../results/nyc_benchmark_results.json', 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\n💾 Results saved to: results/nyc_benchmark_results.json")

    except Exception as e:
        print(f"\n❌ Error running benchmarks: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
