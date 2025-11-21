"""
Load healthcare data into Elasticsearch Cloud
"""

import os
import csv
import json
from elasticsearch import Elasticsearch, helpers
from datetime import datetime

def get_elasticsearch_client():
    """Create and return Elasticsearch client"""
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
    return es

def create_indices(es):
    """Create indices in Elasticsearch"""
    print("Creating Elasticsearch indices...")
    
    # Patients index
    patients_mapping = {
        "mappings": {
            "properties": {
                "patient_id": {"type": "keyword"},
                "age": {"type": "integer"},
                "gender": {"type": "keyword"},
                "primary_condition": {"type": "keyword"},
                "registration_date": {"type": "date"},
                "risk_score": {"type": "float"}
            }
        }
    }
    
    if not es.indices.exists(index='patients'):
        es.indices.create(index='patients', body=patients_mapping)
        print("  ✓ Created patients index")
    
    # Medical events index
    events_mapping = {
        "mappings": {
            "properties": {
                "event_id": {"type": "keyword"},
                "patient_id": {"type": "keyword"},
                "event_type": {"type": "keyword"},
                "department": {"type": "keyword"},
                "timestamp": {"type": "date"},
                "duration_minutes": {"type": "integer"},
                "severity": {"type": "keyword"},
                "cost_usd": {"type": "float"}
            }
        }
    }
    
    if not es.indices.exists(index='medical_events'):
        es.indices.create(index='medical_events', body=events_mapping)
        print("  ✓ Created medical_events index")
    
    # IoT telemetry index
    telemetry_mapping = {
        "mappings": {
            "properties": {
                "reading_id": {"type": "keyword"},
                "device_id": {"type": "keyword"},
                "patient_id": {"type": "keyword"},
                "device_type": {"type": "keyword"},
                "timestamp": {"type": "date"},
                "value": {"type": "float"},
                "unit": {"type": "keyword"},
                "is_abnormal": {"type": "boolean"}
            }
        }
    }
    
    if not es.indices.exists(index='iot_telemetry'):
        es.indices.create(index='iot_telemetry', body=telemetry_mapping)
        print("  ✓ Created iot_telemetry index")

def load_patients(es, csv_file):
    """Load patients data from CSV"""
    print(f"\nLoading patients from {csv_file}...")
    
    def generate_docs():
        with open(csv_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                yield {
                    "_index": "patients",
                    "_id": row['patient_id'],
                    "_source": {
                        "patient_id": row['patient_id'],
                        "age": int(row['age']),
                        "gender": row['gender'],
                        "primary_condition": row['primary_condition'],
                        "registration_date": row['registration_date'],
                        "risk_score": float(row['risk_score'])
                    }
                }
    
    success, failed = helpers.bulk(es, generate_docs(), chunk_size=1000, request_timeout=60)
    print(f"  ✓ Loaded {success:,} patients")
    return success

def load_events(es, csv_file):
    """Load medical events data from CSV"""
    print(f"\nLoading medical events from {csv_file}...")
    
    def generate_docs():
        with open(csv_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                yield {
                    "_index": "medical_events",
                    "_id": row['event_id'],
                    "_source": {
                        "event_id": row['event_id'],
                        "patient_id": row['patient_id'],
                        "event_type": row['event_type'],
                        "department": row['department'],
                        "timestamp": row['timestamp'],
                        "duration_minutes": int(row['duration_minutes']),
                        "severity": row['severity'],
                        "cost_usd": float(row['cost_usd'])
                    }
                }
    
    success, failed = helpers.bulk(es, generate_docs(), chunk_size=1000, request_timeout=60)
    print(f"  ✓ Loaded {success:,} medical events")
    return success

def load_telemetry(es, csv_file):
    """Load IoT telemetry data from CSV"""
    print(f"\nLoading IoT telemetry from {csv_file}...")
    
    def generate_docs():
        with open(csv_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                yield {
                    "_index": "iot_telemetry",
                    "_id": row['reading_id'],
                    "_source": {
                        "reading_id": row['reading_id'],
                        "device_id": row['device_id'],
                        "patient_id": row['patient_id'],
                        "device_type": row['device_type'],
                        "timestamp": row['timestamp'],
                        "value": float(row['value']),
                        "unit": row['unit'],
                        "is_abnormal": row['is_abnormal'].lower() == 'true'
                    }
                }
    
    success, failed = helpers.bulk(es, generate_docs(), chunk_size=1000, request_timeout=60)
    print(f"  ✓ Loaded {success:,} telemetry readings")
    return success

def verify_data(es):
    """Verify loaded data"""
    print("\nVerifying data in Elasticsearch...")
    
    patients_count = es.count(index='patients')['count']
    events_count = es.count(index='medical_events')['count']
    telemetry_count = es.count(index='iot_telemetry')['count']
    
    print(f"  Patients: {patients_count:,}")
    print(f"  Medical events: {events_count:,}")
    print(f"  IoT telemetry: {telemetry_count:,}")
    
    # Get storage sizes
    stats = es.indices.stats(index=['patients', 'medical_events', 'iot_telemetry'])
    
    print("\n  Storage sizes:")
    for index_name, index_stats in stats['indices'].items():
        size_bytes = index_stats['total']['store']['size_in_bytes']
        size_mb = size_bytes / (1024 * 1024)
        print(f"    {index_name}: {size_mb:.2f} MB")

def main():
    """Main data loading pipeline"""
    print("=" * 60)
    print("Loading Healthcare Data into Elasticsearch Cloud")
    print("=" * 60)
    
    # Create client
    es = get_elasticsearch_client()
    
    # Create indices
    create_indices(es)
    
    # Load data
    data_dir = "../data/datasets"
    load_patients(es, f"{data_dir}/patients.csv")
    load_events(es, f"{data_dir}/medical_events.csv")
    load_telemetry(es, f"{data_dir}/iot_telemetry.csv")
    
    # Verify
    verify_data(es)
    
    print("\n" + "=" * 60)
    print("✅ Data loading complete!")
    print("=" * 60)

if __name__ == '__main__':
    main()
