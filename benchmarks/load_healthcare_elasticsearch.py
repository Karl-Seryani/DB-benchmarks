#!/usr/bin/env python3
"""
Load healthcare data into Elasticsearch

Usage:
    python load_healthcare_elasticsearch.py --scale 10m
    python load_healthcare_elasticsearch.py --scale 100m
"""

import argparse
import os
import time
from pathlib import Path
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk
import pyarrow.parquet as pq
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

def create_indices(es, index_prefix):
    """Create Elasticsearch indices with mappings"""

    # Patients index
    patients_mapping = {
        "mappings": {
            "properties": {
                "patient_id": {"type": "long"},
                "age": {"type": "integer"},
                "gender": {"type": "keyword"},
                "blood_type": {"type": "keyword"},
                "primary_condition": {"type": "keyword"},
                "insurance_type": {"type": "keyword"},
                "registration_date": {"type": "date"}
            }
        },
        "settings": {
            "number_of_shards": 3,
            "number_of_replicas": 0,
            "refresh_interval": "-1"  # Disable refresh during bulk load
        }
    }

    # Medical events index
    events_mapping = {
        "mappings": {
            "properties": {
                "event_id": {"type": "long"},
                "patient_id": {"type": "long"},
                "department": {"type": "keyword"},
                "event_type": {"type": "keyword"},
                "severity": {"type": "keyword"},
                "cost_usd": {"type": "float"},
                "duration_minutes": {"type": "integer"},
                "timestamp": {"type": "date"}
            }
        },
        "settings": {
            "number_of_shards": 5,
            "number_of_replicas": 0,
            "refresh_interval": "-1"
        }
    }

    # Prescriptions index
    prescriptions_mapping = {
        "mappings": {
            "properties": {
                "prescription_id": {"type": "long"},
                "patient_id": {"type": "long"},
                "medication": {"type": "keyword"},
                "dosage": {"type": "keyword"},
                "frequency": {"type": "keyword"},
                "duration_days": {"type": "integer"},
                "refills": {"type": "integer"},
                "cost_usd": {"type": "float"},
                "prescribed_date": {"type": "date"}
            }
        },
        "settings": {
            "number_of_shards": 3,
            "number_of_replicas": 0,
            "refresh_interval": "-1"
        }
    }

    indices = [
        (f"{index_prefix}_patients", patients_mapping),
        (f"{index_prefix}_medical_events", events_mapping),
        (f"{index_prefix}_prescriptions", prescriptions_mapping)
    ]

    for index_name, mapping in indices:
        if es.indices.exists(index=index_name):
            es.indices.delete(index=index_name)
        es.indices.create(index=index_name, body=mapping)
        print(f"  Created index: {index_name}")


def generate_actions(df, index_name):
    """Generate bulk actions from dataframe"""
    for _, row in df.iterrows():
        doc = row.to_dict()
        # Convert timestamps to ISO format
        for key, value in doc.items():
            if pd.isna(value):
                doc[key] = None
            elif hasattr(value, 'isoformat'):
                doc[key] = value.isoformat()

        yield {
            "_index": index_name,
            "_source": doc
        }


def load_parquet(es, index_name, parquet_path):
    """Load a parquet file into Elasticsearch"""
    print(f"Loading {parquet_path}...")

    # Read parquet
    table = pq.read_table(parquet_path)
    df = table.to_pandas()

    total_rows = len(df)
    batch_size = 5000
    loaded = 0
    start_time = time.time()

    # Process in batches
    for i in range(0, total_rows, batch_size):
        batch_df = df.iloc[i:i+batch_size]
        actions = list(generate_actions(batch_df, index_name))

        success, _ = bulk(es, actions, raise_on_error=False)
        loaded += success

        if (i + batch_size) % 50000 == 0 or i + batch_size >= total_rows:
            progress = min(i + batch_size, total_rows)
            elapsed = time.time() - start_time
            rate = loaded / elapsed if elapsed > 0 else 0
            print(f"  {progress:,}/{total_rows:,} rows ({rate:.0f} rows/sec)")

    elapsed = time.time() - start_time
    print(f"  ✓ Loaded {loaded:,} rows in {elapsed:.1f}s ({loaded/elapsed:.0f} rows/sec)")

    return loaded, elapsed


def main():
    parser = argparse.ArgumentParser(description='Load healthcare data into Elasticsearch')
    parser.add_argument('--scale', choices=['1m', '10m', '100m'], required=True,
                       help='Dataset scale to load')

    args = parser.parse_args()

    # Determine paths
    dataset_name = f"healthcare_{args.scale}"
    dataset_dir = Path(f"datasets/{dataset_name}")

    if not dataset_dir.exists():
        print(f"Error: Dataset directory not found: {dataset_dir}")
        print("Run generate_healthcare_data.py first")
        return

    # Connect to Elasticsearch Cloud
    es_scheme = os.getenv('ELASTICSEARCH_SCHEME', 'https')
    es_host = os.getenv('ELASTICSEARCH_HOST', 'localhost')
    es_port = int(os.getenv('ELASTICSEARCH_PORT', 443))
    es_user = os.getenv('ELASTICSEARCH_USER', 'elastic')
    es_password = os.getenv('ELASTICSEARCH_PASSWORD', '')

    es = Elasticsearch(
        [f"{es_scheme}://{es_host}:{es_port}"],
        basic_auth=(es_user, es_password),
        verify_certs=True
    )

    if not es.ping():
        print("Error: Cannot connect to Elasticsearch")
        return

    print(f"\n{'='*60}")
    print(f"Loading {dataset_name} into Elasticsearch")
    print(f"{'='*60}\n")

    # Create indices
    print("Creating indices...")
    create_indices(es, dataset_name)

    # Load each index
    total_time = 0
    total_rows = 0

    tables = [
        ('patients', f'{dataset_name}_patients.parquet'),
        ('medical_events', f'{dataset_name}_medical_events.parquet'),
        ('prescriptions', f'{dataset_name}_prescriptions.parquet')
    ]

    for table_name, parquet_file in tables:
        index_name = f"{dataset_name}_{table_name}"
        parquet_path = dataset_dir / parquet_file
        if parquet_path.exists():
            rows, elapsed = load_parquet(es, index_name, parquet_path)
            total_rows += rows
            total_time += elapsed

            # Re-enable refresh
            es.indices.put_settings(
                index=index_name,
                body={"index": {"refresh_interval": "1s"}}
            )
            es.indices.refresh(index=index_name)
        else:
            print(f"Warning: {parquet_path} not found")

    # Get storage stats
    print("\n" + "="*60)
    print("Storage Statistics")
    print("="*60)

    total_size = 0
    for table_name, _ in tables:
        index_name = f"{dataset_name}_{table_name}"
        stats = es.indices.stats(index=index_name)
        size_bytes = stats['_all']['primaries']['store']['size_in_bytes']
        doc_count = stats['_all']['primaries']['docs']['count']
        total_size += size_bytes
        print(f"  {index_name}: {size_bytes / 1024 / 1024:.2f} MB ({doc_count:,} docs)")

    print(f"\n  Total: {total_size / 1024 / 1024:.2f} MB")
    print(f"  Load time: {total_time:.1f}s")
    print(f"  Throughput: {total_rows / total_time:.0f} rows/sec")

    print("\n✅ Elasticsearch load complete!")


if __name__ == '__main__':
    main()
