import clickhouse_driver
from elasticsearch import Elasticsearch
import time
import os
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv("../config.env")

def get_clickhouse_client():
    return clickhouse_driver.Client(
        host=os.getenv("CLICKHOUSE_HOST"),
        port=int(os.getenv("CLICKHOUSE_PORT")),
        user=os.getenv("CLICKHOUSE_USER"),
        password=os.getenv("CLICKHOUSE_PASSWORD"),
        secure=True
    )

def get_elasticsearch_client():
    host = os.getenv("ELASTICSEARCH_HOST")
    port = os.getenv("ELASTICSEARCH_PORT", "443")
    scheme = os.getenv("ELASTICSEARCH_SCHEME", "https")
    full_url = f"{scheme}://{host}:{port}"
    
    return Elasticsearch(
        [full_url],
        basic_auth=(os.getenv("ELASTICSEARCH_USER"), os.getenv("ELASTICSEARCH_PASSWORD")),
        verify_certs=True,
        request_timeout=300
    )

def benchmark_clickhouse(name, query, runs=5):
    client = get_clickhouse_client()
    times = []
    
    print(f"Running ClickHouse: {name}")
    for i in range(runs):
        start = time.time()
        client.execute(query)
        end = time.time()
        times.append((end - start) * 1000)
        print(f"  Run {i+1}: {times[-1]:.2f} ms")
        
    avg_time = sum(times) / len(times)
    return {
        "system": "ClickHouse",
        "benchmark": name,
        "avg_ms": round(avg_time, 2),
        "min_ms": round(min(times), 2),
        "max_ms": round(max(times), 2)
    }

def benchmark_elasticsearch(name, index, body, runs=5):
    es = get_elasticsearch_client()
    times = []
    
    print(f"Running Elasticsearch: {name}")
    for i in range(runs):
        start = time.time()
        es.search(index=index, body=body)
        end = time.time()
        times.append((end - start) * 1000)
        print(f"  Run {i+1}: {times[-1]:.2f} ms")
        
    avg_time = sum(times) / len(times)
    return {
        "system": "Elasticsearch",
        "benchmark": name,
        "avg_ms": round(avg_time, 2),
        "min_ms": round(min(times), 2),
        "max_ms": round(max(times), 2)
    }

def main():
    print("="*60)
    print("NYC TAXI DATA BENCHMARK (3 Million Rows)")
    print("="*60)
    
    results = []
    
    # ---------------------------------------------------------
    # Benchmark 1: Average Fare by Passenger Count
    # ---------------------------------------------------------
    print("\nBenchmark 1: Average Fare by Passenger Count")
    
    ch_query_1 = """
        SELECT passenger_count, AVG(fare_amount) 
        FROM healthcare_benchmark.nyc_taxi 
        GROUP BY passenger_count 
        ORDER BY passenger_count
    """
    
    es_query_1 = {
        "size": 0,
        "aggs": {
            "by_passenger": {
                "terms": {"field": "passenger_count", "size": 10},
                "aggs": {
                    "avg_fare": {"avg": {"field": "fare_amount"}}
                }
            }
        }
    }
    
    results.append(benchmark_clickhouse("Avg Fare by Passenger", ch_query_1))
    results.append(benchmark_elasticsearch("Avg Fare by Passenger", "nyc_taxi", es_query_1))
    
    # ---------------------------------------------------------
    # Benchmark 2: Trip Distance Distribution (> 10 miles)
    # ---------------------------------------------------------
    print("\nBenchmark 2: Long Trips Count (> 10 miles)")
    
    ch_query_2 = "SELECT count(*) FROM healthcare_benchmark.nyc_taxi WHERE trip_distance > 10"
    
    es_query_2 = {
        "size": 0,
        "query": {
            "range": {"trip_distance": {"gt": 10}}
        }
    }
    
    results.append(benchmark_clickhouse("Long Trips Count", ch_query_2))
    results.append(benchmark_elasticsearch("Long Trips Count", "nyc_taxi", es_query_2))
    
    # ---------------------------------------------------------
    # Benchmark 3: Busiest Pickup Zones (Top 10)
    # ---------------------------------------------------------
    print("\nBenchmark 3: Top 10 Pickup Zones")
    
    ch_query_3 = """
        SELECT PULocationID, count(*) as c 
        FROM healthcare_benchmark.nyc_taxi 
        GROUP BY PULocationID 
        ORDER BY c DESC 
        LIMIT 10
    """
    
    es_query_3 = {
        "size": 0,
        "aggs": {
            "top_zones": {
                "terms": {"field": "PULocationID", "size": 10}
            }
        }
    }
    
    results.append(benchmark_clickhouse("Top 10 Pickup Zones", ch_query_3))
    results.append(benchmark_elasticsearch("Top 10 Pickup Zones", "nyc_taxi", es_query_3))
    
    # Save results
    with open("../results/nyc_benchmark_results.json", "w") as f:
        json.dump(results, f, indent=2)
        
    print("\n" + "="*60)
    print("RESULTS SUMMARY")
    print("="*60)
    
    # Print comparison table
    print(f"{'Benchmark':<25} | {'ClickHouse (ms)':<15} | {'Elasticsearch (ms)':<18} | {'Winner':<10}")
    print("-" * 75)
    
    benchmarks = ["Avg Fare by Passenger", "Long Trips Count", "Top 10 Pickup Zones"]
    for b in benchmarks:
        ch = next(r for r in results if r['system'] == "ClickHouse" and r['benchmark'] == b)
        es = next(r for r in results if r['system'] == "Elasticsearch" and r['benchmark'] == b)
        
        if ch['avg_ms'] < es['avg_ms']:
            winner = f"CH ({es['avg_ms']/ch['avg_ms']:.1f}x)"
        else:
            winner = f"ES ({ch['avg_ms']/es['avg_ms']:.1f}x)"
            
        print(f"{b:<25} | {ch['avg_ms']:<15} | {es['avg_ms']:<18} | {winner:<10}")

if __name__ == "__main__":
    main()
