#!/usr/bin/env python3
"""
Run benchmarks on healthcare data for ClickHouse vs Elasticsearch

12 benchmarks organized into 3 categories:

FAIR BENCHMARKS (4) - Equivalent operations on both systems:
1. Simple Aggregation - GROUP BY with COUNT/AVG
2. Multi-Field GROUP BY - Grouping by multiple dimensions
3. Range Filter + Aggregation - Numeric filter with aggregations
4. Cardinality Count - COUNT DISTINCT equivalent

CLICKHOUSE STRENGTHS (4) - Operations where ClickHouse excels:
5. Complex JOIN - Native SQL JOIN across tables
6. Time-Series Window - Date bucketing with multiple aggregations
7. Subquery Filter - WHERE clause with subquery
8. Advanced SQL - HAVING + ORDER BY aggregates + LIMIT

ELASTICSEARCH STRENGTHS (4) - Operations where Elasticsearch excels:
9. Full-Text Search - Text matching with relevance
10. Wildcard/Prefix Search - Pattern matching on text fields
11. Recent Data Filter - Time-filtered aggregation (inverted index advantage)
12. High-Cardinality Terms - Many unique values aggregation

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


def get_fair_benchmarks(database, index_prefix):
    """
    FAIR BENCHMARKS - Equivalent operations on both systems
    These test the same logical operation with equivalent queries
    """
    return {
        # 1. Simple Aggregation
        'simple_aggregation': {
            'name': 'Simple Aggregation',
            'category': 'fair',
            'description': 'GROUP BY single field with COUNT and AVG - equivalent on both systems',
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

        # 2. Multi-Field GROUP BY
        'multi_field_groupby': {
            'name': 'Multi-Field GROUP BY',
            'category': 'fair',
            'description': 'GROUP BY two fields with aggregations - equivalent on both systems',
            'clickhouse': f"""
                SELECT
                    department,
                    severity,
                    COUNT(*) as event_count,
                    AVG(cost_usd) as avg_cost
                FROM {database}.medical_events
                GROUP BY department, severity
                ORDER BY event_count DESC
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
                                    'avg_cost': {'avg': {'field': 'cost_usd'}}
                                }
                            }
                        }
                    }
                }
            },
            'es_index': f'{index_prefix}_medical_events'
        },

        # 3. Range Filter + Aggregation
        'range_filter_agg': {
            'name': 'Range Filter + Aggregation',
            'category': 'fair',
            'description': 'Filter by cost range then aggregate - equivalent on both systems',
            'clickhouse': f"""
                SELECT
                    department,
                    COUNT(*) as event_count,
                    AVG(cost_usd) as avg_cost,
                    SUM(cost_usd) as total_cost
                FROM {database}.medical_events
                WHERE cost_usd BETWEEN 500 AND 5000
                GROUP BY department
                ORDER BY total_cost DESC
            """,
            'elasticsearch': {
                'size': 0,
                'query': {
                    'range': {
                        'cost_usd': {'gte': 500, 'lte': 5000}
                    }
                },
                'aggs': {
                    'by_department': {
                        'terms': {'field': 'department', 'size': 20, 'order': {'total_cost': 'desc'}},
                        'aggs': {
                            'avg_cost': {'avg': {'field': 'cost_usd'}},
                            'total_cost': {'sum': {'field': 'cost_usd'}}
                        }
                    }
                }
            },
            'es_index': f'{index_prefix}_medical_events'
        },

        # 4. Cardinality Count
        'cardinality_count': {
            'name': 'Cardinality Count',
            'category': 'fair',
            'description': 'COUNT DISTINCT equivalent - same operation on both systems',
            'clickhouse': f"""
                SELECT
                    department,
                    COUNT(*) as event_count,
                    COUNT(DISTINCT patient_id) as unique_patients
                FROM {database}.medical_events
                GROUP BY department
                ORDER BY unique_patients DESC
            """,
            'elasticsearch': {
                'size': 0,
                'aggs': {
                    'by_department': {
                        'terms': {'field': 'department', 'size': 20, 'order': {'unique_patients': 'desc'}},
                        'aggs': {
                            'unique_patients': {'cardinality': {'field': 'patient_id'}}
                        }
                    }
                }
            },
            'es_index': f'{index_prefix}_medical_events'
        }
    }


def get_clickhouse_strength_benchmarks(database, index_prefix):
    """
    CLICKHOUSE STRENGTHS - Operations where ClickHouse architecture excels
    These showcase columnar storage and native SQL advantages
    
    Some operations are marked 'es_not_possible': True because ES fundamentally
    cannot perform them (JOINs, subqueries). These are shown as "❌ Not Possible"
    instead of running a fake comparison.
    """
    return {
        # 5. Complex JOIN - ES CANNOT DO THIS
        'complex_join': {
            'name': 'Complex JOIN',
            'category': 'clickhouse_strength',
            'description': 'Native SQL JOIN across tables - ES cannot do this',
            'why_ch_wins': 'ClickHouse supports native SQL JOINs. Elasticsearch has no JOIN capability.',
            'es_not_possible': True,  # Flag: don't run ES, just show "Not Possible"
            'clickhouse': f"""
                SELECT
                    p.primary_condition,
                    p.insurance_type,
                    COUNT(*) as event_count,
                    AVG(e.cost_usd) as avg_cost
                FROM {database}.patients p
                JOIN {database}.medical_events e ON p.patient_id = e.patient_id
                WHERE p.age > 50
                GROUP BY p.primary_condition, p.insurance_type
                ORDER BY event_count DESC
                LIMIT 20
            """,
            'elasticsearch': None,  # Not possible
            'es_index': None,
            'es_limitation': 'Elasticsearch cannot perform JOINs between indices. Requires denormalization or application-side joins with multiple queries.'
        },

        # 6. Time-Series Window Analysis
        'time_series_window': {
            'name': 'Time-Series Analysis',
            'category': 'clickhouse_strength',
            'description': 'Daily time bucketing with multiple aggregations - ClickHouse optimized for time-series',
            'why_ch_wins': 'ClickHouse has optimized date functions and columnar storage excels at time-series scans.',
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

        # 7. Subquery Filter - ES CANNOT DO THIS
        'subquery_filter': {
            'name': 'Subquery Filter',
            'category': 'clickhouse_strength',
            'description': 'Filter using subquery result - ES cannot do dynamic subqueries',
            'why_ch_wins': 'ClickHouse supports subqueries natively. Elasticsearch cannot compute dynamic thresholds.',
            'es_not_possible': True,  # Flag: don't run ES, just show "Not Possible"
            'clickhouse': f"""
                SELECT
                    department,
                    COUNT(*) as high_cost_events,
                    AVG(cost_usd) as avg_cost
                FROM {database}.medical_events
                WHERE cost_usd > (
                    SELECT AVG(cost_usd) FROM {database}.medical_events
                )
                GROUP BY department
                ORDER BY high_cost_events DESC
            """,
            'elasticsearch': None,  # Not possible
            'es_index': None,
            'es_limitation': 'Elasticsearch cannot execute subqueries. Requires multiple API calls and application-side logic to compute dynamic thresholds.'
        },

        # 8. Advanced SQL (HAVING + ORDER BY aggregate) - ES CANNOT DO THIS EQUIVALENTLY
        'advanced_sql': {
            'name': 'Advanced SQL Features',
            'category': 'clickhouse_strength',
            'description': 'HAVING clause + exact percentiles + ORDER BY aggregate + precise LIMIT',
            'why_ch_wins': 'Native SQL with HAVING, exact percentile calculations, complex ORDER BY, and precise LIMIT control.',
            'es_not_possible': True,  # Flag: ES cannot do equivalent operation
            'clickhouse': f"""
                SELECT
                    department,
                    severity,
                    COUNT(*) as event_count,
                    AVG(cost_usd) as avg_cost,
                    quantile(0.95)(cost_usd) as p95_cost
                FROM {database}.medical_events
                GROUP BY department, severity
                HAVING event_count > 1000
                ORDER BY avg_cost DESC
                LIMIT 25
            """,
            'elasticsearch': None,  # Not possible equivalently
            'es_index': None,
            'es_limitation': 'Elasticsearch cannot do: (1) Exact percentiles (uses TDigest approximation), (2) True HAVING semantics (bucket_selector is limited), (3) Precise ORDER BY aggregate + LIMIT. These SQL features have no equivalent in ES.'
        }
    }


def get_elasticsearch_strength_benchmarks(database, index_prefix):
    """
    ELASTICSEARCH STRENGTHS - Operations where Elasticsearch architecture excels
    These showcase inverted index and search-oriented advantages
    """
    return {
        # 9. Full-Text Search
        'fulltext_search': {
            'name': 'Full-Text Search',
            'category': 'elasticsearch_strength',
            'description': 'Text search with relevance scoring - Elasticsearch core strength',
            'why_es_wins': 'Elasticsearch uses inverted indexes optimized for text search. ClickHouse requires LIKE which scans all data.',
            'clickhouse': f"""
                SELECT
                    event_type,
                    department,
                    COUNT(*) as match_count
                FROM {database}.medical_events
                WHERE event_type LIKE '%Surgery%' OR event_type LIKE '%Procedure%'
                GROUP BY event_type, department
                ORDER BY match_count DESC
                LIMIT 20
            """,
            'elasticsearch': {
                'size': 0,
                'query': {
                    'multi_match': {
                        'query': 'Surgery Procedure',
                        'fields': ['event_type'],
                        'type': 'best_fields'
                    }
                },
                'aggs': {
                    'by_event_type': {
                        'terms': {'field': 'event_type', 'size': 20},
                        'aggs': {
                            'by_department': {
                                'terms': {'field': 'department', 'size': 10}
                            }
                        }
                    }
                }
            },
            'es_index': f'{index_prefix}_medical_events'
        },

        # 10. Prefix/Wildcard Search
        'prefix_search': {
            'name': 'Prefix Search',
            'category': 'elasticsearch_strength',
            'description': 'Search by field prefix - inverted index advantage',
            'why_es_wins': 'Elasticsearch prefix queries use inverted index. ClickHouse LIKE with leading wildcard cannot use indexes.',
            'clickhouse': f"""
                SELECT
                    medication,
                    COUNT(*) as prescription_count,
                    AVG(cost_usd) as avg_cost
                FROM {database}.prescriptions
                WHERE medication LIKE 'Met%'
                GROUP BY medication
                ORDER BY prescription_count DESC
            """,
            'elasticsearch': {
                'size': 0,
                'query': {
                    'prefix': {
                        'medication': 'Met'
                    }
                },
                'aggs': {
                    'by_medication': {
                        'terms': {'field': 'medication', 'size': 20},
                        'aggs': {
                            'avg_cost': {'avg': {'field': 'cost_usd'}}
                        }
                    }
                }
            },
            'es_index': f'{index_prefix}_prescriptions'
        },

        # 11. Recent Data Filter (Time-bounded)
        'recent_data_filter': {
            'name': 'Recent Data Filter',
            'category': 'elasticsearch_strength',
            'description': 'Filter to recent time window then aggregate - ES caching advantage',
            'why_es_wins': 'Elasticsearch filter caching and inverted indexes excel at repeated time-filtered queries.',
            'clickhouse': f"""
                SELECT
                    department,
                    severity,
                    COUNT(*) as event_count,
                    AVG(cost_usd) as avg_cost
                FROM {database}.medical_events
                WHERE timestamp >= now() - INTERVAL 7 DAY
                GROUP BY department, severity
                ORDER BY event_count DESC
            """,
            'elasticsearch': {
                'size': 0,
                'query': {
                    'range': {
                        'timestamp': {
                            'gte': 'now-7d'
                        }
                    }
                },
                'aggs': {
                    'by_department': {
                        'terms': {'field': 'department', 'size': 20},
                        'aggs': {
                            'by_severity': {
                                'terms': {'field': 'severity', 'size': 5},
                                'aggs': {
                                    'avg_cost': {'avg': {'field': 'cost_usd'}}
                                }
                            }
                        }
                    }
                }
            },
            'es_index': f'{index_prefix}_medical_events'
        },

        # 12. High-Cardinality Terms
        'high_cardinality_terms': {
            'name': 'High-Cardinality Terms',
            'category': 'elasticsearch_strength',
            'description': 'Aggregate by high-cardinality field (patient_id) - ES term lookup',
            'why_es_wins': 'Elasticsearch doc_values provide efficient term lookups for high-cardinality fields.',
            'clickhouse': f"""
                SELECT
                    patient_id,
                    COUNT(*) as event_count,
                    SUM(cost_usd) as total_cost
                FROM {database}.medical_events
                GROUP BY patient_id
                ORDER BY total_cost DESC
                LIMIT 100
            """,
            'elasticsearch': {
                'size': 0,
                'aggs': {
                    'top_patients': {
                        'terms': {
                            'field': 'patient_id',
                            'size': 100,
                            'order': {'total_cost': 'desc'}
                        },
                        'aggs': {
                            'total_cost': {'sum': {'field': 'cost_usd'}}
                        }
                    }
                }
            },
            'es_index': f'{index_prefix}_medical_events'
        }
    }


def get_all_benchmarks(database, index_prefix):
    """Combine all benchmark categories"""
    benchmarks = {}
    benchmarks.update(get_fair_benchmarks(database, index_prefix))
    benchmarks.update(get_clickhouse_strength_benchmarks(database, index_prefix))
    benchmarks.update(get_elasticsearch_strength_benchmarks(database, index_prefix))
    return benchmarks


def main():
    parser = argparse.ArgumentParser(description='Run healthcare benchmarks')
    parser.add_argument('--scale', choices=['1m', '10m', '100m'], required=True,
                       help='Dataset scale to benchmark')
    parser.add_argument('--output', default='results', help='Output directory')
    parser.add_argument('--category', choices=['all', 'fair', 'clickhouse', 'elasticsearch'], 
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
    print(f"{'='*70}\n")

    # Get benchmarks based on category
    if args.category == 'all':
        benchmarks = get_all_benchmarks(database, index_prefix)
    elif args.category == 'fair':
        benchmarks = get_fair_benchmarks(database, index_prefix)
    elif args.category == 'clickhouse':
        benchmarks = get_clickhouse_strength_benchmarks(database, index_prefix)
    elif args.category == 'elasticsearch':
        benchmarks = get_elasticsearch_strength_benchmarks(database, index_prefix)

    results = {
        'dataset': database,
        'timestamp': datetime.now().isoformat(),
        'config': {
            'warmup_runs': NUM_WARMUP,
            'measured_runs': NUM_RUNS
        },
        'benchmarks': {
            'fair': {},
            'clickhouse_strength': {},
            'elasticsearch_strength': {}
        },
        'summary': {
            'fair': {'clickhouse_wins': 0, 'elasticsearch_wins': 0, 'es_not_possible': 0},
            'clickhouse_strength': {'clickhouse_wins': 0, 'elasticsearch_wins': 0, 'es_not_possible': 0},
            'elasticsearch_strength': {'clickhouse_wins': 0, 'elasticsearch_wins': 0, 'es_not_possible': 0}
        }
    }

    current_category = None
    for bench_key, bench in benchmarks.items():
        category = bench['category']
        
        if category != current_category:
            current_category = category
            category_label = {
                'fair': '⚖️  FAIR BENCHMARKS (Equivalent Operations)',
                'clickhouse_strength': '🟡 CLICKHOUSE STRENGTHS',
                'elasticsearch_strength': '🔵 ELASTICSEARCH STRENGTHS'
            }
            print(f"\n{'='*70}")
            print(f"{category_label.get(category, category)}")
            print(f"{'='*70}")

        print(f"\n{bench['name']}")
        print(f"  {bench['description']}")
        if bench.get('why_ch_wins'):
            print(f"  💡 {bench['why_ch_wins']}")
        if bench.get('why_es_wins'):
            print(f"  💡 {bench['why_es_wins']}")
        print("-" * 50)

        # Run ClickHouse
        ch_result = run_clickhouse_query(ch_client, database, bench['clickhouse'])
        print(f"  ClickHouse: {ch_result['avg_time']:.2f} ms (avg of {NUM_RUNS} runs, {NUM_WARMUP} warmup)")

        # Check if ES can do this operation
        if bench.get('es_not_possible'):
            # ES cannot perform this operation
            print(f"  Elasticsearch: ❌ NOT POSSIBLE")
            print(f"  📝 {bench.get('es_limitation', 'Operation not supported')}")
            
            # ClickHouse wins by default (ES can't compete)
            winner = 'clickhouse'
            speedup = None  # No comparison possible
            
            es_result = {
                'avg_time': None,
                'not_possible': True,
                'limitation': bench.get('es_limitation', 'Operation not supported')
            }
            
            print(f"  Winner: CLICKHOUSE (ES cannot perform this operation)")
        else:
            # Run Elasticsearch normally
            es_result = run_elasticsearch_query(es_client, bench['es_index'], bench['elasticsearch'])
            print(f"  Elasticsearch: {es_result['avg_time']:.2f} ms (avg of {NUM_RUNS} runs, {NUM_WARMUP} warmup)")

            # Determine winner
            if ch_result['avg_time'] < es_result['avg_time']:
                winner = 'clickhouse'
                speedup = es_result['avg_time'] / ch_result['avg_time']
            else:
                winner = 'elasticsearch'
                speedup = ch_result['avg_time'] / es_result['avg_time']

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
        if bench.get('why_ch_wins'):
            bench_result['why_ch_wins'] = bench['why_ch_wins']
        if bench.get('why_es_wins'):
            bench_result['why_es_wins'] = bench['why_es_wins']

        results['benchmarks'][category][bench_key] = bench_result

        # Update summary (es_not_possible counted separately, not as CH win)
        if bench.get('es_not_possible'):
            results['summary'][category]['es_not_possible'] += 1
        elif winner == 'clickhouse':
            results['summary'][category]['clickhouse_wins'] += 1
        else:
            results['summary'][category]['elasticsearch_wins'] += 1

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
    print(f"Config: {NUM_WARMUP} warmup runs + {NUM_RUNS} measured runs per benchmark")
    
    for category, label in [
        ('fair', '⚖️  Fair Benchmarks'),
        ('clickhouse_strength', '🟡 ClickHouse Strengths'),
        ('elasticsearch_strength', '🔵 Elasticsearch Strengths')
    ]:
        summary = results['summary'][category]
        ch_wins = summary['clickhouse_wins']
        es_wins = summary['elasticsearch_wins']
        es_not_possible = summary['es_not_possible']
        print(f"\n{label}:")
        if es_not_possible > 0:
            print(f"  ClickHouse: {ch_wins} wins | Elasticsearch: {es_wins} wins | ES Not Possible: {es_not_possible}")
        else:
            print(f"  ClickHouse: {ch_wins} wins | Elasticsearch: {es_wins} wins")

    print(f"\n{'='*70}")
    print(f"Results saved to {output_file}")
    print(f"{'='*70}")


if __name__ == '__main__':
    main()
