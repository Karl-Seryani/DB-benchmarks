"""
Load healthcare data into ClickHouse Cloud
"""

import os
import csv
from clickhouse_driver import Client
from datetime import datetime

def get_clickhouse_client():
    """Create and return ClickHouse client"""
    return Client(
        host=os.getenv('CLICKHOUSE_HOST'),
        port=int(os.getenv('CLICKHOUSE_PORT', '9440')),
        user=os.getenv('CLICKHOUSE_USER', 'default'),
        password=os.getenv('CLICKHOUSE_PASSWORD'),
        secure=os.getenv('CLICKHOUSE_SECURE', 'true').lower() == 'true'
    )

def create_schema(client):
    """Create database and tables in ClickHouse"""
    print("Creating ClickHouse schema...")
    
    # Create database
    client.execute('CREATE DATABASE IF NOT EXISTS healthcare_benchmark')
    
    # Create patients table
    client.execute('''
        CREATE TABLE IF NOT EXISTS healthcare_benchmark.patients (
            patient_id String,
            age UInt8,
            gender String,
            primary_condition String,
            registration_date DateTime,
            risk_score Float32
        ) ENGINE = MergeTree()
        ORDER BY patient_id
    ''')
    print("  ✓ Created patients table")
    
    # Create medical_events table
    client.execute('''
        CREATE TABLE IF NOT EXISTS healthcare_benchmark.medical_events (
            event_id String,
            patient_id String,
            event_type String,
            department String,
            timestamp DateTime,
            duration_minutes UInt16,
            severity String,
            cost_usd Float32
        ) ENGINE = MergeTree()
        ORDER BY (patient_id, timestamp)
    ''')
    print("  ✓ Created medical_events table")
    
    # Create iot_telemetry table
    client.execute('''
        CREATE TABLE IF NOT EXISTS healthcare_benchmark.iot_telemetry (
            reading_id String,
            device_id String,
            patient_id String,
            device_type String,
            timestamp DateTime,
            value Float32,
            unit String,
            is_abnormal UInt8
        ) ENGINE = MergeTree()
        ORDER BY (device_id, timestamp)
    ''')
    print("  ✓ Created iot_telemetry table")

def load_patients(client, csv_file):
    """Load patients data from CSV"""
    print(f"\nLoading patients from {csv_file}...")
    
    data = []
    with open(csv_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            data.append((
                row['patient_id'],
                int(row['age']),
                row['gender'],
                row['primary_condition'],
                datetime.fromisoformat(row['registration_date']),
                float(row['risk_score'])
            ))
    
    client.execute(
        'INSERT INTO healthcare_benchmark.patients VALUES',
        data
    )
    print(f"  ✓ Loaded {len(data):,} patients")
    return len(data)

def load_events(client, csv_file):
    """Load medical events data from CSV"""
    print(f"\nLoading medical events from {csv_file}...")
    
    data = []
    batch_size = 10000
    total_rows = 0
    
    with open(csv_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            data.append((
                row['event_id'],
                row['patient_id'],
                row['event_type'],
                row['department'],
                datetime.fromisoformat(row['timestamp']),
                int(row['duration_minutes']),
                row['severity'],
                float(row['cost_usd'])
            ))
            
            if len(data) >= batch_size:
                client.execute(
                    'INSERT INTO healthcare_benchmark.medical_events VALUES',
                    data
                )
                total_rows += len(data)
                print(f"  Progress: {total_rows:,} rows...", end='\r')
                data = []
        
        # Insert remaining rows
        if data:
            client.execute(
                'INSERT INTO healthcare_benchmark.medical_events VALUES',
                data
            )
            total_rows += len(data)
    
    print(f"  ✓ Loaded {total_rows:,} medical events")
    return total_rows

def load_telemetry(client, csv_file):
    """Load IoT telemetry data from CSV"""
    print(f"\nLoading IoT telemetry from {csv_file}...")
    
    data = []
    batch_size = 10000
    total_rows = 0
    
    with open(csv_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            data.append((
                row['reading_id'],
                row['device_id'],
                row['patient_id'],
                row['device_type'],
                datetime.fromisoformat(row['timestamp']),
                float(row['value']),
                row['unit'],
                1 if row['is_abnormal'].lower() == 'true' else 0
            ))
            
            if len(data) >= batch_size:
                client.execute(
                    'INSERT INTO healthcare_benchmark.iot_telemetry VALUES',
                    data
                )
                total_rows += len(data)
                print(f"  Progress: {total_rows:,} rows...", end='\r')
                data = []
        
        # Insert remaining rows
        if data:
            client.execute(
                'INSERT INTO healthcare_benchmark.iot_telemetry VALUES',
                data
            )
            total_rows += len(data)
    
    print(f"  ✓ Loaded {total_rows:,} telemetry readings")
    return total_rows

def verify_data(client):
    """Verify loaded data"""
    print("\nVerifying data in ClickHouse...")
    
    patients_count = client.execute('SELECT COUNT(*) FROM healthcare_benchmark.patients')[0][0]
    events_count = client.execute('SELECT COUNT(*) FROM healthcare_benchmark.medical_events')[0][0]
    telemetry_count = client.execute('SELECT COUNT(*) FROM healthcare_benchmark.iot_telemetry')[0][0]
    
    print(f"  Patients: {patients_count:,}")
    print(f"  Medical events: {events_count:,}")
    print(f"  IoT telemetry: {telemetry_count:,}")
    
    # Get storage size
    result = client.execute('''
        SELECT
            table,
            formatReadableSize(sum(bytes)) as size
        FROM system.parts
        WHERE database = 'healthcare_benchmark' AND active
        GROUP BY table
    ''')
    
    print("\n  Storage sizes:")
    for table, size in result:
        print(f"    {table}: {size}")

def main():
    """Main data loading pipeline"""
    print("=" * 60)
    print("Loading Healthcare Data into ClickHouse Cloud")
    print("=" * 60)
    
    # Create client
    client = get_clickhouse_client()
    
    # Create schema
    create_schema(client)
    
    # Load data
    data_dir = "../data/datasets"
    load_patients(client, f"{data_dir}/patients.csv")
    load_events(client, f"{data_dir}/medical_events.csv")
    load_telemetry(client, f"{data_dir}/iot_telemetry.csv")
    
    # Verify
    verify_data(client)
    
    print("\n" + "=" * 60)
    print("✅ Data loading complete!")
    print("=" * 60)

if __name__ == '__main__':
    main()
