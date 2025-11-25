#!/usr/bin/env python3
"""
Load healthcare data into ClickHouse

Usage:
    python load_healthcare_clickhouse.py --scale 10m
    python load_healthcare_clickhouse.py --scale 100m
"""

import argparse
import os
import time
from pathlib import Path
from clickhouse_driver import Client
import pyarrow.parquet as pq
from dotenv import load_dotenv

load_dotenv()

def create_tables(client, database):
    """Create the healthcare tables"""

    client.execute(f"CREATE DATABASE IF NOT EXISTS {database}")

    # Patients table
    client.execute(f"""
        CREATE TABLE IF NOT EXISTS {database}.patients (
            patient_id Int64,
            age Int32,
            gender String,
            blood_type String,
            primary_condition String,
            insurance_type String,
            registration_date Date
        ) ENGINE = MergeTree()
        ORDER BY patient_id
    """)

    # Medical events table
    client.execute(f"""
        CREATE TABLE IF NOT EXISTS {database}.medical_events (
            event_id Int64,
            patient_id Int64,
            department String,
            event_type String,
            severity String,
            cost_usd Float64,
            duration_minutes Int32,
            timestamp DateTime
        ) ENGINE = MergeTree()
        ORDER BY (patient_id, timestamp)
    """)

    # Prescriptions table
    client.execute(f"""
        CREATE TABLE IF NOT EXISTS {database}.prescriptions (
            prescription_id Int64,
            patient_id Int64,
            medication String,
            dosage String,
            frequency String,
            duration_days Int32,
            refills Int32,
            cost_usd Float64,
            prescribed_date Date
        ) ENGINE = MergeTree()
        ORDER BY (patient_id, prescribed_date)
    """)


def load_parquet(client, database, table_name, parquet_path):
    """Load a parquet file into ClickHouse"""
    print(f"Loading {parquet_path}...")

    # Read parquet
    table = pq.read_table(parquet_path)
    df = table.to_pandas()

    # Convert datetime columns
    for col in df.columns:
        if df[col].dtype == 'datetime64[ns]':
            if 'date' in col.lower():
                df[col] = df[col].dt.date
            else:
                df[col] = df[col].dt.to_pydatetime()

    # Insert in batches
    batch_size = 100000
    total_rows = len(df)

    start_time = time.time()

    for i in range(0, total_rows, batch_size):
        batch = df.iloc[i:i+batch_size]
        data = [tuple(row) for row in batch.values]
        columns = list(df.columns)

        client.execute(
            f"INSERT INTO {database}.{table_name} ({', '.join(columns)}) VALUES",
            data
        )

        progress = min(i + batch_size, total_rows)
        elapsed = time.time() - start_time
        rate = progress / elapsed if elapsed > 0 else 0
        print(f"  {progress:,}/{total_rows:,} rows ({rate:.0f} rows/sec)")

    elapsed = time.time() - start_time
    print(f"  ✓ Loaded {total_rows:,} rows in {elapsed:.1f}s ({total_rows/elapsed:.0f} rows/sec)")

    return total_rows, elapsed


def main():
    parser = argparse.ArgumentParser(description='Load healthcare data into ClickHouse')
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

    # Connect to ClickHouse Cloud
    client = Client(
        host=os.getenv('CLICKHOUSE_HOST', 'localhost'),
        port=int(os.getenv('CLICKHOUSE_PORT', 9440)),
        user=os.getenv('CLICKHOUSE_USER', 'default'),
        password=os.getenv('CLICKHOUSE_PASSWORD', ''),
        secure=os.getenv('CLICKHOUSE_SECURE', 'true').lower() == 'true'
    )

    print(f"\n{'='*60}")
    print(f"Loading {dataset_name} into ClickHouse")
    print(f"{'='*60}\n")

    # Create tables
    print("Creating tables...")
    create_tables(client, dataset_name)

    # Load each table
    total_time = 0
    total_rows = 0

    tables = [
        ('patients', f'{dataset_name}_patients.parquet'),
        ('medical_events', f'{dataset_name}_medical_events.parquet'),
        ('prescriptions', f'{dataset_name}_prescriptions.parquet')
    ]

    for table_name, parquet_file in tables:
        parquet_path = dataset_dir / parquet_file
        if parquet_path.exists():
            rows, elapsed = load_parquet(client, dataset_name, table_name, parquet_path)
            total_rows += rows
            total_time += elapsed
        else:
            print(f"Warning: {parquet_path} not found")

    # Get storage stats
    print("\n" + "="*60)
    print("Storage Statistics")
    print("="*60)

    result = client.execute(f"""
        SELECT
            table,
            formatReadableSize(sum(bytes)) as size,
            sum(rows) as rows
        FROM system.parts
        WHERE database = '{dataset_name}' AND active
        GROUP BY table
        ORDER BY table
    """)

    total_size = 0
    for row in result:
        print(f"  {row[0]}: {row[1]} ({row[2]:,} rows)")
        size_result = client.execute(f"""
            SELECT sum(bytes) FROM system.parts
            WHERE database = '{dataset_name}' AND table = '{row[0]}' AND active
        """)
        total_size += size_result[0][0]

    print(f"\n  Total: {total_size / 1024 / 1024:.2f} MB")
    print(f"  Load time: {total_time:.1f}s")
    print(f"  Throughput: {total_rows / total_time:.0f} rows/sec")

    print("\n✅ ClickHouse load complete!")


if __name__ == '__main__':
    main()
