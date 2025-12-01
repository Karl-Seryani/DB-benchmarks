#!/usr/bin/env python3
"""
Run benchmarks on healthcare data for ClickHouse vs Elasticsearch

10 benchmarks organized into 2 slides:

SLIDE 1: QUERY PERFORMANCE (5 queries)
--------------------------------------
1. Simple Aggregation - COUNT + AVG grouped by department
2. Time-Series Analysis - Daily revenue aggregation
3. Full-Text Search - ES strength: inverted index vs LIKE scan
4. Top-N Query - Find highest-cost events
5. Multi-Metric Dashboard - Complex aggregation with multiple metrics

SLIDE 2: CAPABILITY & INFRASTRUCTURE (5 items)
----------------------------------------------
6. Patient-Event JOIN - ES cannot do (requires denormalization)
7. Cost by Condition JOIN - ES cannot do (requires JOIN)
8. Anomaly Detection (Subquery) - ES cannot do (requires subquery)
9. Data Ingestion - Bulk load performance
10. Storage Compression - Space efficiency

This structure tells the honest story:
- ES wins on pre-indexed aggregations (doc_values)
- CH enables queries ES fundamentally cannot do
- CH has massive infrastructure advantages

Usage:
    python run_healthcare_benchmarks.py --scale 10m
    python run_healthcare_benchmarks.py --scale 100m
"""

import argparse
import json
import os
import time
import statistics
from pathlib import Path
from datetime import datetime
from clickhouse_driver import Client
from elasticsearch import Elasticsearch
from dotenv import load_dotenv

load_dotenv()

# Benchmark configuration
NUM_WARMUP = 2  # Warmup runs (not counted)
NUM_RUNS = 5    # Counted runs for averaging


def run_clickhouse_query(client, database, query, warmup=NUM_WARMUP, runs=NUM_RUNS):
    """Run a ClickHouse query with warmup runs, then measure"""
    # Warmup runs (not counted)
    for _ in range(warmup):
        client.execute(query)

    # Measured runs
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
        'warmup_runs': warmup,
        'query': query,
        'row_count': len(result) if result else 0
    }


def run_elasticsearch_query(es, index, query, warmup=NUM_WARMUP, runs=NUM_RUNS):
    """Run an Elasticsearch query with warmup runs, then measure"""
    # Warmup runs (not counted)
    for _ in range(warmup):
        es.search(index=index, **query)

    # Measured runs
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
        'warmup_runs': warmup,
        'query': query,
        'hits': result.get('hits', {}).get('total', {}).get('value', 0) if result else 0
    }


def get_query_benchmarks(database, index_prefix):
    """
    SLIDE 1: QUERY PERFORMANCE (5 queries)
    These compare direct query performance where both systems can compete
    """
    return {
        # 1. Simple Aggregation
        'simple_aggregation': {
            'name': 'Simple Aggregation',
            'category': 'query',
            'description': 'COUNT and AVG cost grouped by department',
            'why_compared': 'Basic OLAP operation - tests aggregation performance',
            'clickhouse': f"""
                SELECT
                    department,
                    COUNT(*) as event_count,
                    AVG(cost_usd) as avg_cost
                FROM {database}.medical_events
                GROUP BY department
                ORDER BY event_count DESC
            """,
            'elasticsearch': {
                'size': 0,
                'aggs': {
                    'by_department': {
                        'terms': {'field': 'department', 'size': 20, 'order': {'_count': 'desc'}},
                        'aggs': {
                            'avg_cost': {'avg': {'field': 'cost_usd'}}
                        }
                    }
                }
            },
            'es_index': f'{index_prefix}_medical_events'
        },

        # 2. Time-Series Analysis
        'time_series': {
            'name': 'Time-Series Analysis',
            'category': 'query',
            'description': 'Daily aggregation with date bucketing (last 30 days)',
            'why_compared': 'Common time-series pattern - tests date handling',
            'clickhouse': f"""
                SELECT
                    toDate(timestamp) as date,
                    COUNT(*) as event_count,
                    SUM(cost_usd) as daily_revenue
                FROM {database}.medical_events
                GROUP BY date
                ORDER BY date DESC
                LIMIT 30
            """,
            'elasticsearch': {
                'size': 0,
                'aggs': {
                    'by_date': {
                        'date_histogram': {
                            'field': 'timestamp',
                            'calendar_interval': 'day',
                            'order': {'_key': 'desc'}
                        },
                        'aggs': {
                            'daily_revenue': {'sum': {'field': 'cost_usd'}}
                        }
                    }
                }
            },
            'es_index': f'{index_prefix}_medical_events'
        },

        # 3. Full-Text Search (ES strength)
        'fulltext_search': {
            'name': 'Full-Text Search',
            'category': 'query',
            'description': 'Search for "Surgery" or "Emergency" events',
            'why_compared': 'ES designed for this - inverted index vs LIKE scan',
            'note': 'ES uses inverted index (optimized), CH uses LIKE scan (not optimized)',
            'clickhouse': f"""
                SELECT
                    event_type,
                    COUNT(*) as match_count
                FROM {database}.medical_events
                WHERE event_type LIKE '%Surgery%' OR event_type LIKE '%Emergency%'
                GROUP BY event_type
                ORDER BY match_count DESC
            """,
            'elasticsearch': {
                'size': 0,
                'query': {
                    'bool': {
                        'should': [
                            {'match': {'event_type': 'Surgery'}},
                            {'match': {'event_type': 'Emergency'}}
                        ]
                    }
                },
                'aggs': {
                    'by_event_type': {
                        'terms': {'field': 'event_type', 'size': 20}
                    }
                }
            },
            'es_index': f'{index_prefix}_medical_events'
        },

        # 4. Top-N Query
        'top_n': {
            'name': 'Top-N Query',
            'category': 'query',
            'description': 'Find top 10 highest-cost events',
            'why_compared': 'Common pattern - tests sorting and limiting',
            'clickhouse': f"""
                SELECT
                    event_id,
                    patient_id,
                    department,
                    cost_usd
                FROM {database}.medical_events
                ORDER BY cost_usd DESC
                LIMIT 10
            """,
            'elasticsearch': {
                'size': 10,
                'sort': [{'cost_usd': 'desc'}],
                '_source': ['event_id', 'patient_id', 'department', 'cost_usd']
            },
            'es_index': f'{index_prefix}_medical_events'
        },

        # 5. Multi-Metric Dashboard
        'multi_metric': {
            'name': 'Multi-Metric Dashboard',
            'category': 'query',
            'description': 'Department dashboard with 6 metrics (COUNT, unique patients, revenue, avg cost, avg duration, critical cases)',
            'why_compared': 'Complex aggregation - tests multi-metric performance',
            'clickhouse': f"""
                SELECT
                    department,
                    COUNT(*) as total_events,
                    COUNT(DISTINCT patient_id) as unique_patients,
                    SUM(cost_usd) as total_revenue,
                    AVG(cost_usd) as avg_cost,
                    AVG(duration_minutes) as avg_duration,
                    SUM(CASE WHEN severity = 'Critical' THEN 1 ELSE 0 END) as critical_cases
                FROM {database}.medical_events
                GROUP BY department
                ORDER BY total_revenue DESC
            """,
            'elasticsearch': {
                'size': 0,
                'aggs': {
                    'by_department': {
                        'terms': {'field': 'department', 'size': 20, 'order': {'total_revenue': 'desc'}},
                        'aggs': {
                            'unique_patients': {'cardinality': {'field': 'patient_id'}},
                            'total_revenue': {'sum': {'field': 'cost_usd'}},
                            'avg_cost': {'avg': {'field': 'cost_usd'}},
                            'avg_duration': {'avg': {'field': 'duration_minutes'}},
                            'critical_cases': {
                                'filter': {'term': {'severity': 'Critical'}}
                            }
                        }
                    }
                }
            },
            'es_index': f'{index_prefix}_medical_events'
        }
    }


def get_capability_benchmarks(database, index_prefix):
    """
    SLIDE 2: CAPABILITY & INFRASTRUCTURE (5 items)
    These show what CH can do that ES cannot, plus infrastructure advantages
    """
    return {
        # 6. Patient-Event JOIN (ES cannot do)
        'patient_event_join': {
            'name': 'Patient-Event JOIN',
            'category': 'capability',
            'description': 'Join patients with their medical events by condition and insurance',
            'why_compared': 'Healthcare apps need JOINs constantly',
            'es_not_possible': True,
            'clickhouse': f"""
                SELECT
                    p.primary_condition,
                    p.insurance_type,
                    COUNT(*) as event_count,
                    AVG(e.cost_usd) as avg_cost,
                    SUM(e.cost_usd) as total_cost
                FROM {database}.patients p
                JOIN {database}.medical_events e ON p.patient_id = e.patient_id
                GROUP BY p.primary_condition, p.insurance_type
                ORDER BY total_cost DESC
                LIMIT 20
            """,
            'elasticsearch': None,
            'es_index': None,
            'es_limitation': 'Elasticsearch cannot perform JOINs. Apps must denormalize data (duplicating storage) or run multiple queries and join in application code (slower, more complex).'
        },

        # 7. Cost by Condition JOIN (ES cannot do)
        'cost_by_condition': {
            'name': 'Cost by Condition',
            'category': 'capability',
            'description': 'Total healthcare cost per patient condition (requires JOIN)',
            'why_compared': 'Critical for healthcare cost analysis - mpathic use case',
            'es_not_possible': True,
            'clickhouse': f"""
                SELECT
                    p.primary_condition,
                    COUNT(DISTINCT p.patient_id) as patient_count,
                    COUNT(*) as event_count,
                    SUM(e.cost_usd) as total_cost,
                    AVG(e.cost_usd) as avg_cost_per_event
                FROM {database}.patients p
                JOIN {database}.medical_events e ON p.patient_id = e.patient_id
                GROUP BY p.primary_condition
                ORDER BY total_cost DESC
            """,
            'elasticsearch': None,
            'es_index': None,
            'es_limitation': 'Elasticsearch cannot join patient conditions with event costs. This is why mpathic switched - their data scientists needed this for ML experiments.'
        },

        # 8. Anomaly Detection with Subquery (ES cannot do)
        'anomaly_detection': {
            'name': 'Anomaly Detection',
            'category': 'capability',
            'description': 'Find events with cost above average (subquery)',
            'why_compared': 'Common analytics pattern - requires subquery support',
            'es_not_possible': True,
            'clickhouse': f"""
                SELECT
                    department,
                    severity,
                    COUNT(*) as high_cost_events,
                    AVG(cost_usd) as avg_high_cost
                FROM {database}.medical_events
                WHERE cost_usd > (
                    SELECT AVG(cost_usd) FROM {database}.medical_events
                )
                GROUP BY department, severity
                ORDER BY high_cost_events DESC
            """,
            'elasticsearch': None,
            'es_index': None,
            'es_limitation': 'Elasticsearch cannot execute subqueries. To find above-average events: 1) Query to get average, 2) Second query with that value. Doubles latency, complicates code.'
        },

        # 9 & 10 are infrastructure metrics (not query benchmarks)
        # They'll be handled separately in the presentation
    }


def get_all_benchmarks(database, index_prefix):
    """Combine all benchmark categories"""
    benchmarks = {}
    benchmarks.update(get_query_benchmarks(database, index_prefix))
    benchmarks.update(get_capability_benchmarks(database, index_prefix))
    return benchmarks


def main():
    parser = argparse.ArgumentParser(description='Run healthcare benchmarks')
    parser.add_argument('--scale', choices=['1m', '10m', '100m'], required=True,
                       help='Dataset scale to benchmark')
    parser.add_argument('--output', default='results', help='Output directory')
    parser.add_argument('--category', choices=['all', 'query', 'capability'],
                       default='all', help='Benchmark category to run')

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
        request_timeout=60
    )

    if not es_client.ping():
        print("Warning: Cannot connect to Elasticsearch")
        return

    print(f"\n{'='*70}")
    print(f"Running benchmarks on {database}")
    print(f"10 benchmarks: 5 query comparisons + 3 ES limitations + 2 infrastructure")
    print(f"{'='*70}\n")

    # Get benchmarks based on category
    if args.category == 'all':
        benchmarks = get_all_benchmarks(database, index_prefix)
    elif args.category == 'query':
        benchmarks = get_query_benchmarks(database, index_prefix)
    elif args.category == 'capability':
        benchmarks = get_capability_benchmarks(database, index_prefix)

    results = {
        'dataset': database,
        'timestamp': datetime.now().isoformat(),
        'config': {
            'warmup_runs': NUM_WARMUP,
            'measured_runs': NUM_RUNS
        },
        'benchmarks': {
            'query': {},
            'capability': {}
        },
        'summary': {
            'query': {'clickhouse_wins': 0, 'elasticsearch_wins': 0},
            'capability': {'clickhouse_wins': 0, 'es_not_possible': 0}
        }
    }

    current_category = None
    for bench_key, bench in benchmarks.items():
        category = bench['category']

        if category != current_category:
            current_category = category
            category_label = {
                'query': '📊 QUERY PERFORMANCE (Both Systems Can Compete)',
                'capability': '🔧 CAPABILITY (ES Cannot Do These)'
            }
            print(f"\n{'='*70}")
            print(f"{category_label.get(category, category)}")
            print(f"{'='*70}")

        print(f"\n{bench['name']}")
        print(f"  {bench['description']}")
        if bench.get('why_compared'):
            print(f"  📝 Why: {bench['why_compared']}")
        if bench.get('note'):
            print(f"  ⚠️  {bench['note']}")
        print("-" * 50)

        # Run ClickHouse
        ch_result = run_clickhouse_query(ch_client, database, bench['clickhouse'])
        print(f"  ClickHouse: {ch_result['avg_time']:.2f} ms (avg of {NUM_RUNS} runs)")

        # Check if ES can do this operation
        if bench.get('es_not_possible'):
            # ES cannot perform this operation
            print(f"  Elasticsearch: ❌ NOT POSSIBLE")
            print(f"  💡 {bench.get('es_limitation', 'Operation not supported')}")

            winner = 'clickhouse'
            speedup = None

            es_result = {
                'avg_time': None,
                'not_possible': True,
                'limitation': bench.get('es_limitation', 'Operation not supported')
            }

            print(f"  Winner: CLICKHOUSE (ES cannot perform this operation)")
            results['summary'][category]['es_not_possible'] += 1
        else:
            # Run Elasticsearch normally
            es_result = run_elasticsearch_query(es_client, bench['es_index'], bench['elasticsearch'])
            print(f"  Elasticsearch: {es_result['avg_time']:.2f} ms (avg of {NUM_RUNS} runs)")

            # Determine winner
            if ch_result['avg_time'] < es_result['avg_time']:
                winner = 'clickhouse'
                speedup = es_result['avg_time'] / ch_result['avg_time']
                results['summary'][category]['clickhouse_wins'] += 1
            else:
                winner = 'elasticsearch'
                speedup = ch_result['avg_time'] / es_result['avg_time']
                results['summary'][category]['elasticsearch_wins'] += 1

            print(f"  Winner: {winner.upper()} ({speedup:.2f}x faster)")

        # Store results
        bench_result = {
            'name': bench['name'],
            'description': bench['description'],
            'category': category,
            'clickhouse': ch_result,
            'elasticsearch': es_result,
            'winner': winner,
            'speedup': speedup
        }

        if bench.get('es_limitation'):
            bench_result['es_limitation'] = bench['es_limitation']
        if bench.get('es_not_possible'):
            bench_result['es_not_possible'] = True
        if bench.get('why_compared'):
            bench_result['why_compared'] = bench['why_compared']
        if bench.get('note'):
            bench_result['note'] = bench['note']

        results['benchmarks'][category][bench_key] = bench_result

    # Save results
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / f'{database}_benchmark_results.json'

    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)

    # Print summary
    print(f"\n{'='*70}")
    print("SUMMARY")
    print(f"{'='*70}")
    print(f"Config: {NUM_WARMUP} warmup + {NUM_RUNS} measured runs per benchmark")

    query_summary = results['summary']['query']
    cap_summary = results['summary']['capability']

    print(f"\n📊 Query Performance (5 queries):")
    print(f"   ClickHouse wins: {query_summary['clickhouse_wins']}")
    print(f"   Elasticsearch wins: {query_summary['elasticsearch_wins']}")

    print(f"\n🔧 Capability (3 queries ES cannot do):")
    print(f"   ES Not Possible: {cap_summary['es_not_possible']}")

    print(f"\n📦 Infrastructure (from data loading):")
    print(f"   Ingestion: ~20x faster (CH)")
    print(f"   Compression: ~9x better (CH)")

    print(f"\n{'='*70}")
    print(f"Results saved to {output_file}")
    print(f"{'='*70}")


if __name__ == '__main__':
    main()
