#!/usr/bin/env python3
"""
Run benchmarks on healthcare data for ClickHouse vs Elasticsearch

7 consistent benchmarks across all dataset scales:
1. Simple Aggregation
2. Multi-Level GROUP BY
3. Time-Series Aggregation
4. Filter + Aggregation
5. JOIN Performance (2-table)
6. Complex Analytical Query
7. Concurrent Load

Usage:
    python run_healthcare_benchmarks.py --scale 10m
    python run_healthcare_benchmarks.py --scale 100m
"""

import argparse
import json
import os
import time
import statistics
import concurrent.futures
from pathlib import Path
from datetime import datetime
from clickhouse_driver import Client
from elasticsearch import Elasticsearch
from dotenv import load_dotenv

load_dotenv()

# Number of runs per benchmark for averaging
NUM_RUNS = 3


def run_clickhouse_query(client, database, query, runs=NUM_RUNS):
    """Run a ClickHouse query multiple times and return stats"""
    times = []
    result = None

    for _ in range(runs):
        start = time.time()
        result = client.execute(query)
        elapsed = (time.time() - start) * 1000  # ms
        times.append(elapsed)

    return {
        'avg_time': statistics.mean(times),
        'min_time': min(times),
        'max_time': max(times),
        'std_dev': statistics.stdev(times) if len(times) > 1 else 0,
        'runs': runs,
        'query': query,
        'row_count': len(result) if result else 0
    }


def run_elasticsearch_query(es, index, query, runs=NUM_RUNS):
    """Run an Elasticsearch query multiple times and return stats"""
    times = []
    result = None

    for _ in range(runs):
        start = time.time()
        result = es.search(index=index, **query)
        elapsed = (time.time() - start) * 1000  # ms
        times.append(elapsed)

    return {
        'avg_time': statistics.mean(times),
        'min_time': min(times),
        'max_time': max(times),
        'std_dev': statistics.stdev(times) if len(times) > 1 else 0,
        'runs': runs,
        'query': query,
        'hits': result.get('hits', {}).get('total', {}).get('value', 0) if result else 0
    }


def get_benchmarks(database, index_prefix):
    """Define the 7 benchmarks for both systems"""

    benchmarks = {
        'simple_aggregation': {
            'name': 'Simple Aggregation',
            'description': 'Group by department with multiple aggregations',
            'clickhouse': f"""
                SELECT
                    department,
                    COUNT(*) as event_count,
                    AVG(cost_usd) as avg_cost,
                    SUM(cost_usd) as total_cost,
                    MIN(cost_usd) as min_cost,
                    MAX(cost_usd) as max_cost
                FROM {database}.medical_events
                GROUP BY department
                ORDER BY event_count DESC
            """,
            'elasticsearch': {
                'size': 0,
                'aggs': {
                    'by_department': {
                        'terms': {'field': 'department', 'size': 20},
                        'aggs': {
                            'avg_cost': {'avg': {'field': 'cost_usd'}},
                            'total_cost': {'sum': {'field': 'cost_usd'}},
                            'min_cost': {'min': {'field': 'cost_usd'}},
                            'max_cost': {'max': {'field': 'cost_usd'}}
                        }
                    }
                }
            },
            'es_index': f'{index_prefix}_medical_events'
        },

        'multi_level_group': {
            'name': 'Multi-Level GROUP BY',
            'description': 'Multi-dimensional grouping with filters',
            'clickhouse': f"""
                SELECT
                    department,
                    severity,
                    COUNT(*) as event_count,
                    AVG(cost_usd) as avg_cost,
                    AVG(duration_minutes) as avg_duration
                FROM {database}.medical_events
                GROUP BY department, severity
                HAVING event_count > 100
                ORDER BY department, severity
            """,
            'elasticsearch': {
                'size': 0,
                'aggs': {
                    'by_department': {
                        'terms': {'field': 'department', 'size': 20},
                        'aggs': {
                            'by_severity': {
                                'terms': {'field': 'severity', 'size': 10},
                                'aggs': {
                                    'avg_cost': {'avg': {'field': 'cost_usd'}},
                                    'avg_duration': {'avg': {'field': 'duration_minutes'}}
                                }
                            }
                        }
                    }
                }
            },
            'es_index': f'{index_prefix}_medical_events'
        },

        'time_series': {
            'name': 'Time-Series Aggregation',
            'description': 'Daily aggregations over time',
            'clickhouse': f"""
                SELECT
                    toDate(timestamp) as date,
                    COUNT(*) as event_count,
                    SUM(cost_usd) as daily_revenue,
                    AVG(cost_usd) as avg_cost,
                    COUNT(DISTINCT patient_id) as unique_patients
                FROM {database}.medical_events
                GROUP BY date
                ORDER BY date DESC
                LIMIT 365
            """,
            'elasticsearch': {
                'size': 0,
                'aggs': {
                    'by_date': {
                        'date_histogram': {
                            'field': 'timestamp',
                            'calendar_interval': 'day'
                        },
                        'aggs': {
                            'daily_revenue': {'sum': {'field': 'cost_usd'}},
                            'avg_cost': {'avg': {'field': 'cost_usd'}},
                            'unique_patients': {'cardinality': {'field': 'patient_id'}}
                        }
                    }
                }
            },
            'es_index': f'{index_prefix}_medical_events'
        },

        'filter_aggregation': {
            'name': 'Filter + Aggregation',
            'description': 'Filtered query on recent data with aggregations',
            'clickhouse': f"""
                SELECT
                    department,
                    severity,
                    COUNT(*) as event_count,
                    AVG(cost_usd) as avg_cost,
                    SUM(cost_usd) as total_cost
                FROM {database}.medical_events
                WHERE timestamp >= now() - INTERVAL 30 DAY
                GROUP BY department, severity
                ORDER BY total_cost DESC
            """,
            'elasticsearch': {
                'size': 0,
                'query': {
                    'range': {
                        'timestamp': {
                            'gte': 'now-30d'
                        }
                    }
                },
                'aggs': {
                    'by_department': {
                        'terms': {'field': 'department', 'size': 20},
                        'aggs': {
                            'by_severity': {
                                'terms': {'field': 'severity'},
                                'aggs': {
                                    'avg_cost': {'avg': {'field': 'cost_usd'}},
                                    'total_cost': {'sum': {'field': 'cost_usd'}}
                                }
                            }
                        }
                    }
                }
            },
            'es_index': f'{index_prefix}_medical_events'
        },

        'join_performance': {
            'name': 'JOIN Performance',
            'description': 'Join patients with medical events',
            'clickhouse': f"""
                SELECT
                    p.primary_condition,
                    p.insurance_type,
                    COUNT(*) as event_count,
                    COUNT(DISTINCT p.patient_id) as patient_count,
                    AVG(e.cost_usd) as avg_cost,
                    SUM(e.cost_usd) as total_cost
                FROM {database}.patients p
                JOIN {database}.medical_events e ON p.patient_id = e.patient_id
                WHERE p.age > 50
                GROUP BY p.primary_condition, p.insurance_type
                HAVING event_count > 100
                ORDER BY total_cost DESC
                LIMIT 50
            """,
            'elasticsearch': {
                'size': 0,
                'aggs': {
                    'by_condition': {
                        'terms': {'field': 'primary_condition', 'size': 20},
                        'aggs': {
                            'by_insurance': {
                                'terms': {'field': 'insurance_type', 'size': 10}
                            }
                        }
                    }
                }
            },
            'es_index': f'{index_prefix}_patients',
            'note': 'ES cannot do JOINs - showing patient aggregation only'
        },

        'complex_analytical': {
            'name': 'Complex Analytical Query',
            'description': 'Subquery with percentiles and conditions',
            'clickhouse': f"""
                SELECT
                    department,
                    COUNT(*) as high_cost_events,
                    AVG(cost_usd) as avg_cost,
                    quantile(0.5)(cost_usd) as median_cost,
                    quantile(0.9)(cost_usd) as p90_cost,
                    quantile(0.99)(cost_usd) as p99_cost
                FROM {database}.medical_events
                WHERE cost_usd > (
                    SELECT AVG(cost_usd) FROM {database}.medical_events
                )
                GROUP BY department
                HAVING high_cost_events > 1000
                ORDER BY avg_cost DESC
            """,
            'elasticsearch': {
                'size': 0,
                'aggs': {
                    'by_department': {
                        'terms': {'field': 'department', 'size': 20},
                        'aggs': {
                            'avg_cost': {'avg': {'field': 'cost_usd'}},
                            'median_cost': {'percentiles': {'field': 'cost_usd', 'percents': [50]}},
                            'p90_cost': {'percentiles': {'field': 'cost_usd', 'percents': [90]}},
                            'p99_cost': {'percentiles': {'field': 'cost_usd', 'percents': [99]}}
                        }
                    }
                }
            },
            'es_index': f'{index_prefix}_medical_events',
            'note': 'ES uses fixed threshold approximation instead of subquery'
        }
    }

    return benchmarks


def run_concurrent_benchmark(func, *args, concurrent_count=5):
    """Run a benchmark concurrently and measure total time"""
    start = time.time()

    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrent_count) as executor:
        futures = [executor.submit(func, *args, runs=1) for _ in range(concurrent_count)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]

    total_time = (time.time() - start) * 1000  # ms

    return {
        'avg_time': total_time,
        'min_time': min(r['avg_time'] for r in results),
        'max_time': max(r['avg_time'] for r in results),
        'concurrent_queries': concurrent_count,
        'query': args[-1] if args else None
    }


def main():
    parser = argparse.ArgumentParser(description='Run healthcare benchmarks')
    parser.add_argument('--scale', choices=['1m', '10m', '100m'], required=True,
                       help='Dataset scale to benchmark')
    parser.add_argument('--output', default='results', help='Output directory')

    args = parser.parse_args()

    database = f"healthcare_{args.scale}"
    index_prefix = f"healthcare_{args.scale}"

    # Connect to ClickHouse Cloud
    ch_client = Client(
        host=os.getenv('CLICKHOUSE_HOST', 'localhost'),
        port=int(os.getenv('CLICKHOUSE_PORT', 9440)),
        user=os.getenv('CLICKHOUSE_USER', 'default'),
        password=os.getenv('CLICKHOUSE_PASSWORD', ''),
        secure=os.getenv('CLICKHOUSE_SECURE', 'true').lower() == 'true'
    )

    # Connect to Elasticsearch Cloud
    es_scheme = os.getenv('ELASTICSEARCH_SCHEME', 'https')
    es_host = os.getenv('ELASTICSEARCH_HOST', 'localhost')
    es_port = int(os.getenv('ELASTICSEARCH_PORT', 443))
    es_user = os.getenv('ELASTICSEARCH_USER', 'elastic')
    es_password = os.getenv('ELASTICSEARCH_PASSWORD', '')

    es_client = Elasticsearch(
        [f"{es_scheme}://{es_host}:{es_port}"],
        basic_auth=(es_user, es_password),
        verify_certs=True,
        request_timeout=60  # 60 second timeout for large dataset queries
    )

    if not es_client.ping():
        print("Warning: Cannot connect to Elasticsearch")
        return

    print(f"\n{'='*60}")
    print(f"Running benchmarks on {database}")
    print(f"{'='*60}\n")

    benchmarks = get_benchmarks(database, index_prefix)
    results = {
        'dataset': database,
        'timestamp': datetime.now().isoformat(),
        'benchmarks': {}
    }

    for bench_key, bench in benchmarks.items():
        print(f"\n{bench['name']}")
        print(f"  {bench['description']}")
        print("-" * 50)

        # Run ClickHouse
        if bench.get('concurrent'):
            ch_result = run_concurrent_benchmark(
                run_clickhouse_query, ch_client, database, bench['clickhouse'],
                concurrent_count=bench['concurrent']
            )
        else:
            ch_result = run_clickhouse_query(ch_client, database, bench['clickhouse'])

        print(f"  ClickHouse: {ch_result['avg_time']:.2f} ms")

        # Run Elasticsearch
        if bench.get('concurrent'):
            es_result = run_concurrent_benchmark(
                run_elasticsearch_query, es_client, bench['es_index'], bench['elasticsearch'],
                concurrent_count=bench['concurrent']
            )
        else:
            es_result = run_elasticsearch_query(es_client, bench['es_index'], bench['elasticsearch'])

        print(f"  Elasticsearch: {es_result['avg_time']:.2f} ms")

        # Determine winner
        if ch_result['avg_time'] < es_result['avg_time']:
            winner = 'clickhouse'
            speedup = es_result['avg_time'] / ch_result['avg_time']
        else:
            winner = 'elasticsearch'
            speedup = ch_result['avg_time'] / es_result['avg_time']

        print(f"  Winner: {winner.upper()} ({speedup:.2f}x faster)")

        results['benchmarks'][bench_key] = {
            'name': bench['name'],
            'description': bench['description'],
            'clickhouse': ch_result,
            'elasticsearch': es_result,
            'winner': winner,
            'speedup': speedup
        }

        if bench.get('note'):
            results['benchmarks'][bench_key]['note'] = bench['note']

    # Save results
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / f'{database}_benchmark_results.json'

    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)

    print(f"\n{'='*60}")
    print(f"Results saved to {output_file}")
    print(f"{'='*60}")

    # Summary
    ch_wins = sum(1 for b in results['benchmarks'].values() if b['winner'] == 'clickhouse')
    es_wins = len(results['benchmarks']) - ch_wins

    print(f"\nSummary: ClickHouse {ch_wins} - Elasticsearch {es_wins}")


if __name__ == '__main__':
    main()
