"""
Measure actual storage usage from ClickHouse and Elasticsearch
Run this after loading data to get real storage measurements
"""

import os
import json
from datetime import datetime
from clickhouse_driver import Client as ClickHouseClient
from elasticsearch import Elasticsearch
from dotenv import load_dotenv

# Load environment variables
load_dotenv("../config.env")

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
        )
    )

def measure_clickhouse_healthcare_storage():
    """Measure actual ClickHouse storage for healthcare data"""
    print("\n" + "="*60)
    print("Measuring ClickHouse Healthcare Storage")
    print("="*60)
    
    client = get_clickhouse_client()
    
    # Check if database exists
    databases = client.execute("SHOW DATABASES")
    db_names = [db[0] for db in databases]
    
    if 'healthcare_benchmark' not in db_names:
        print("❌ healthcare_benchmark database not found!")
        return None
    
    # Get storage by table
    query = """
        SELECT 
            table,
            formatReadableSize(sum(bytes)) as size_readable,
            sum(bytes) as size_bytes
        FROM system.parts
        WHERE database = 'healthcare_benchmark' AND active
        GROUP BY table
        ORDER BY table
    """
    
    results = client.execute(query)
    
    total_bytes = 0
    storage_data = {}
    
    print("\nHealthcare Storage Breakdown:")
    for table, size_readable, size_bytes in results:
        print(f"  {table}: {size_readable}")
        storage_data[table] = {
            "readable": size_readable,
            "bytes": size_bytes
        }
        total_bytes += size_bytes
    
    # Convert to MiB
    total_mib = total_bytes / (1024 * 1024)
    print(f"\n  TOTAL: {total_mib:.2f} MiB ({total_bytes:,} bytes)")
    
    return {
        "total_mib": round(total_mib, 2),
        "total_bytes": total_bytes,
        "breakdown": storage_data
    }

def measure_clickhouse_nyc_storage():
    """Measure actual ClickHouse storage for NYC taxi data"""
    print("\n" + "="*60)
    print("Measuring ClickHouse NYC Taxi Storage")
    print("="*60)
    
    client = get_clickhouse_client()
    
    # Check if database exists
    databases = client.execute("SHOW DATABASES")
    db_names = [db[0] for db in databases]
    
    if 'nyc_taxi' not in db_names:
        print("❌ nyc_taxi database not found!")
        print("   Run load_nyc_clickhouse.py first")
        return None
    
    # Get storage
    query = """
        SELECT 
            table,
            formatReadableSize(sum(bytes)) as size_readable,
            sum(bytes) as size_bytes,
            count() as row_count
        FROM system.parts
        WHERE database = 'nyc_taxi' AND active
        GROUP BY table
    """
    
    results = client.execute(query)
    
    if not results:
        print("❌ No tables found in nyc_taxi database!")
        return None
    
    total_bytes = 0
    storage_data = {}
    
    print("\nNYC Taxi Storage:")
    for table, size_readable, size_bytes, row_count in results:
        print(f"  {table}: {size_readable}")
        storage_data[table] = {
            "readable": size_readable,
            "bytes": size_bytes
        }
        total_bytes += size_bytes
    
    # Convert to GB
    total_gb = total_bytes / (1024 * 1024 * 1024)
    print(f"\n  TOTAL: {total_gb:.3f} GB ({total_bytes:,} bytes)")
    
    return {
        "total_gb": round(total_gb, 3),
        "total_bytes": total_bytes,
        "breakdown": storage_data
    }

def measure_elasticsearch_healthcare_storage():
    """Measure actual Elasticsearch storage for healthcare data"""
    print("\n" + "="*60)
    print("Measuring Elasticsearch Healthcare Storage")
    print("="*60)
    
    es = get_elasticsearch_client()
    
    indices = ['patients', 'medical_events', 'iot_telemetry']
    
    total_bytes = 0
    storage_data = {}
    
    print("\nHealthcare Storage Breakdown:")
    for index in indices:
        try:
            stats = es.indices.stats(index=index)
            size_bytes = stats['indices'][index]['total']['store']['size_in_bytes']
            size_mb = size_bytes / (1024 * 1024)
            
            print(f"  {index}: {size_mb:.2f} MB")
            storage_data[index] = {
                "mb": round(size_mb, 2),
                "bytes": size_bytes
            }
            total_bytes += size_bytes
        except Exception as e:
            print(f"  ❌ {index}: Not found or error - {e}")
    
    total_mb = total_bytes / (1024 * 1024)
    print(f"\n  TOTAL: {total_mb:.2f} MB ({total_bytes:,} bytes)")
    
    return {
        "total_mb": round(total_mb, 2),
        "total_bytes": total_bytes,
        "breakdown": storage_data
    }

def measure_elasticsearch_nyc_storage():
    """Measure actual Elasticsearch storage for NYC taxi data"""
    print("\n" + "="*60)
    print("Measuring Elasticsearch NYC Taxi Storage")
    print("="*60)
    
    es = get_elasticsearch_client()
    
    try:
        stats = es.indices.stats(index='nyc_taxi')
        size_bytes = stats['indices']['nyc_taxi']['total']['store']['size_in_bytes']
        size_gb = size_bytes / (1024 * 1024 * 1024)
        
        print(f"\n  nyc_taxi: {size_gb:.3f} GB ({size_bytes:,} bytes)")
        
        return {
            "total_gb": round(size_gb, 3),
            "total_bytes": size_bytes
        }
    except Exception as e:
        print(f"❌ nyc_taxi index not found or error: {e}")
        print("   Run load_nyc_elasticsearch.py first")
        return None

def main():
    print("\n" + "="*60)
    print("  ACTUAL STORAGE MEASUREMENT TOOL")
    print("  Measuring real database storage usage")
    print("="*60)
    
    # Measure all storage
    ch_healthcare = measure_clickhouse_healthcare_storage()
    es_healthcare = measure_elasticsearch_healthcare_storage()
    ch_nyc = measure_clickhouse_nyc_storage()
    es_nyc = measure_elasticsearch_nyc_storage()
    
    # Calculate compression ratios
    print("\n" + "="*60)
    print("COMPRESSION ANALYSIS")
    print("="*60)
    
    if ch_healthcare and es_healthcare:
        # Convert both to same unit (bytes) for accurate comparison
        ratio = es_healthcare['total_bytes'] / ch_healthcare['total_bytes']
        
        # Adjust for the nyc_taxi table that's incorrectly in healthcare_benchmark
        if 'nyc_taxi' in ch_healthcare['breakdown']:
            print("\n⚠️  WARNING: nyc_taxi table found in healthcare_benchmark database!")
            print("   This should be in a separate 'nyc_taxi' database.")
            
            # Calculate healthcare-only storage (excluding nyc_taxi)
            healthcare_only_bytes = ch_healthcare['total_bytes']
            if 'nyc_taxi' in ch_healthcare['breakdown']:
                healthcare_only_bytes -= ch_healthcare['breakdown']['nyc_taxi']['bytes']
            
            healthcare_only_mib = healthcare_only_bytes / (1024 * 1024)
            ratio = es_healthcare['total_bytes'] / healthcare_only_bytes
            
            print(f"\nHealthcare ONLY Compression Ratio: {ratio:.1f}x")
            print(f"  ClickHouse: {healthcare_only_mib:.2f} MiB (excluding nyc_taxi)")
            print(f"  Elasticsearch: {es_healthcare['total_mb']:.2f} MB")
        else:
            print(f"\nHealthcare Compression Ratio: {ratio:.1f}x")
            print(f"  ClickHouse: {ch_healthcare['total_mib']:.2f} MiB")
            print(f"  Elasticsearch: {es_healthcare['total_mb']:.2f} MB")
    
    if ch_nyc and es_nyc:
        ratio = es_nyc['total_bytes'] / ch_nyc['total_bytes']
        print(f"\nNYC Taxi Compression Ratio: {ratio:.1f}x")
        print(f"  ClickHouse: {ch_nyc['total_gb']:.3f} GB")
        print(f"  Elasticsearch: {es_nyc['total_gb']:.3f} GB")
    
    # Save results
    results = {
        "measurement_date": datetime.now().isoformat(),
        "healthcare": {
            "clickhouse": ch_healthcare,
            "elasticsearch": es_healthcare,
            "compression_ratio": round(es_healthcare['total_bytes'] / ch_healthcare['total_bytes'], 1) if ch_healthcare and es_healthcare else None
        },
        "nyc_taxi": {
            "clickhouse": ch_nyc,
            "elasticsearch": es_nyc,
            "compression_ratio": round(es_nyc['total_bytes'] / ch_nyc['total_bytes'], 1) if ch_nyc and es_nyc else None
        }
    }
    
    output_file = "../results/actual_storage_measurements.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n✅ Results saved to: {output_file}")
    print("\nUse these ACTUAL measurements to update your benchmark results!")

if __name__ == '__main__':
    main()

