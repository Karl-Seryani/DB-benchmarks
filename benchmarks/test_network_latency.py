"""
Test network latency to ClickHouse Cloud and Elasticsearch Cloud
to verify network overhead is not dominating query times
"""

import os
import time
from clickhouse_driver import Client as ClickHouseClient
from elasticsearch import Elasticsearch

def test_clickhouse_latency(runs=10):
    """Measure round-trip latency to ClickHouse"""
    client = ClickHouseClient(
        host=os.getenv('CLICKHOUSE_HOST'),
        port=int(os.getenv('CLICKHOUSE_PORT', '9440')),
        user=os.getenv('CLICKHOUSE_USER', 'default'),
        password=os.getenv('CLICKHOUSE_PASSWORD'),
        secure=os.getenv('CLICKHOUSE_SECURE', 'true').lower() == 'true'
    )
    
    times = []
    print(f"Testing ClickHouse network latency ({runs} pings)...")
    
    for i in range(runs):
        start = time.time()
        # Simple query that returns immediately - just tests network round trip
        client.execute('SELECT 1')
        end = time.time()
        latency_ms = (end - start) * 1000
        times.append(latency_ms)
        print(f"  Ping {i+1}: {latency_ms:.2f} ms")
    
    avg = sum(times) / len(times)
    min_time = min(times)
    max_time = max(times)
    
    return {
        'avg_ms': avg,
        'min_ms': min_time,
        'max_ms': max_time,
        'times': times
    }

def test_elasticsearch_latency(runs=10):
    """Measure round-trip latency to Elasticsearch"""
    host = os.getenv('ELASTICSEARCH_HOST')
    port = int(os.getenv('ELASTICSEARCH_PORT', '9243'))
    scheme = os.getenv('ELASTICSEARCH_SCHEME', 'https')
    
    es = Elasticsearch(
        [f"{scheme}://{host}:{port}"],
        basic_auth=(
            os.getenv('ELASTICSEARCH_USER'),
            os.getenv('ELASTICSEARCH_PASSWORD')
        )
    )
    
    times = []
    print(f"\nTesting Elasticsearch network latency ({runs} pings)...")
    
    for i in range(runs):
        start = time.time()
        # Simple cluster health check - minimal server processing
        es.cluster.health()
        end = time.time()
        latency_ms = (end - start) * 1000
        times.append(latency_ms)
        print(f"  Ping {i+1}: {latency_ms:.2f} ms")
    
    avg = sum(times) / len(times)
    min_time = min(times)
    max_time = max(times)
    
    return {
        'avg_ms': avg,
        'min_ms': min_time,
        'max_ms': max_time,
        'times': times
    }

def main():
    print("="*60)
    print("Network Latency Test")
    print("="*60)
    print("\nThis test measures baseline network round-trip time")
    print("to verify network overhead is not dominating query times.\n")
    
    # Test ClickHouse
    ch_latency = test_clickhouse_latency(runs=10)
    
    # Test Elasticsearch
    es_latency = test_elasticsearch_latency(runs=10)
    
    # Summary
    print("\n" + "="*60)
    print("Summary")
    print("="*60)
    
    print(f"\nClickHouse Cloud (us-east-1):")
    print(f"  Average latency: {ch_latency['avg_ms']:.2f} ms")
    print(f"  Min: {ch_latency['min_ms']:.2f} ms")
    print(f"  Max: {ch_latency['max_ms']:.2f} ms")
    
    print(f"\nElasticsearch Cloud (us-east-1):")
    print(f"  Average latency: {es_latency['avg_ms']:.2f} ms")
    print(f"  Min: {es_latency['min_ms']:.2f} ms")
    print(f"  Max: {es_latency['max_ms']:.2f} ms")
    
    # Analysis
    print("\n" + "="*60)
    print("Analysis")
    print("="*60)
    
    print(f"\nBenchmark query times were ~50-100ms")
    print(f"Network overhead represents:")
    print(f"  ClickHouse: {(ch_latency['avg_ms']/75)*100:.1f}% of typical query time")
    print(f"  Elasticsearch: {(es_latency['avg_ms']/75)*100:.1f}% of typical query time")
    
    if ch_latency['avg_ms'] < 30 and es_latency['avg_ms'] < 30:
        print("\n✅ Network latency is reasonable (<30ms)")
        print("   Network is NOT a major factor in benchmark results")
    elif ch_latency['avg_ms'] < 50 and es_latency['avg_ms'] < 50:
        print("\n⚠️  Network latency is moderate (30-50ms)")
        print("   Network overhead is noticeable but not dominant")
    else:
        print("\n❌ Network latency is high (>50ms)")
        print("   Network overhead may be significantly affecting results")
        print("   Consider re-running from us-east region or using larger queries")
    
    # Check if latencies are similar
    diff = abs(ch_latency['avg_ms'] - es_latency['avg_ms'])
    if diff < 10:
        print(f"\n✅ Both systems have similar network latency (diff: {diff:.1f}ms)")
        print("   This means the comparison is fair - network affects both equally")
    else:
        print(f"\n⚠️  Latency difference between systems: {diff:.1f}ms")
        print("   One system may have network advantage")

if __name__ == '__main__':
    main()
