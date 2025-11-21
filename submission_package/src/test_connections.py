"""
Test connections to ClickHouse Cloud and Elasticsearch
Updated for cloud-based setup
"""

import sys
import os

def test_clickhouse_cloud():
    """Test ClickHouse Cloud connection"""
    print("Testing ClickHouse Cloud connection...")
    print("-" * 60)
    
    # Check if config is set
    host = os.getenv('CLICKHOUSE_HOST', 'NOT_SET')
    
    if host == 'NOT_SET' or 'your-instance' in host:
        print("⚠️  ClickHouse Cloud not configured yet!")
        print("\nTo configure:")
        print("1. Sign up at: https://clickhouse.cloud/")
        print("2. Create a service (Development tier - free)")
        print("3. Copy config_example.env to config.env")
        print("4. Update with your connection details")
        print("5. Run: export $(cat config.env | xargs)")
        print("\nSee CLICKHOUSE_CLOUD_SETUP.md for detailed instructions")
        return False
    
    try:
        from clickhouse_driver import Client
        
        client = Client(
            host=os.getenv('CLICKHOUSE_HOST'),
            port=int(os.getenv('CLICKHOUSE_PORT', '9440')),
            user=os.getenv('CLICKHOUSE_USER', 'default'),
            password=os.getenv('CLICKHOUSE_PASSWORD'),
            secure=os.getenv('CLICKHOUSE_SECURE', 'true').lower() == 'true'
        )
        
        # Simple query to test connection
        result = client.execute('SELECT version()')
        version = result[0][0]
        
        print(f"✅ ClickHouse Cloud connected successfully!")
        print(f"   Host: {os.getenv('CLICKHOUSE_HOST')}")
        print(f"   Version: {version}")
        
        # Test creating a database
        client.execute('CREATE DATABASE IF NOT EXISTS healthcare_benchmark')
        databases = client.execute('SHOW DATABASES')
        print(f"   Databases available: {len(databases)}")
        
        return True
        
    except Exception as e:
        print(f"❌ ClickHouse Cloud connection failed!")
        print(f"   Error: {e}")
        print("\nTroubleshooting:")
        print("  - Check your credentials in config.env")
        print("  - Verify service is running in ClickHouse Cloud console")
        print("  - Ensure you've set the environment variables")
        return False

def test_elasticsearch():
    """Test Elasticsearch connection (local or cloud)"""
    print("\nTesting Elasticsearch connection...")
    print("-" * 60)
    
    host = os.getenv('ELASTICSEARCH_HOST', 'localhost')
    port = int(os.getenv('ELASTICSEARCH_PORT', '9200'))
    scheme = os.getenv('ELASTICSEARCH_SCHEME', 'http')
    
    try:
        from elasticsearch import Elasticsearch
        
        # Build connection URL
        if os.getenv('ELASTICSEARCH_USER'):
            # Cloud or secured local
            es = Elasticsearch(
                [f"{scheme}://{host}:{port}"],
                basic_auth=(
                    os.getenv('ELASTICSEARCH_USER'),
                    os.getenv('ELASTICSEARCH_PASSWORD')
                )
            )
        else:
            # Unsecured local
            es = Elasticsearch([f"{scheme}://{host}:{port}"])
        
        # Check cluster health
        if es.ping():
            print("✅ Elasticsearch connected successfully!")
            
            # Get cluster info
            info = es.info()
            print(f"   Host: {host}:{port}")
            print(f"   Version: {info['version']['number']}")
            print(f"   Cluster: {info['cluster_name']}")
            
            # Get cluster health
            health = es.cluster.health()
            print(f"   Status: {health['status']}")
            
            return True
        else:
            raise Exception("Ping failed")
            
    except Exception as e:
        print(f"⚠️  Elasticsearch connection failed: {e}")
        print("\nOptions to fix:")
        print("  Option 1 (Easiest): Use Elastic Cloud")
        print("    - Sign up at: https://cloud.elastic.co/")
        print("    - 14-day free trial")
        print("    - Update config.env with cloud credentials")
        print("\n  Option 2: Use Docker locally")
        print("    - Run: docker run -d --name elasticsearch \\")
        print("             -p 9200:9200 \\")
        print("             -e 'discovery.type=single-node' \\")
        print("             docker.elastic.co/elasticsearch/elasticsearch:7.17.4")
        return False

def main():
    """Run all connection tests"""
    print("\n" + "="*60)
    print("  Database Connection Test - Cloud Edition")
    print("="*60 + "\n")
    
    ch_success = test_clickhouse_cloud()
    es_success = test_elasticsearch()
    
    print("\n" + "="*60)
    if ch_success and es_success:
        print("✅ Both databases connected successfully!")
        print("\n🚀 Ready to:")
        print("  • Load healthcare data")
        print("  • Run performance benchmarks")
        print("  • Compare ClickHouse vs Elasticsearch")
        sys.exit(0)
    elif ch_success:
        print("✅ ClickHouse connected!")
        print("⚠️  Still need to set up Elasticsearch")
        print("\nYou can proceed with ClickHouse-only testing for now.")
        sys.exit(0)
    else:
        print("⚠️  Databases not configured yet")
        print("\nNext step: Set up ClickHouse Cloud")
        print("See: CLICKHOUSE_CLOUD_SETUP.md")
        sys.exit(1)

if __name__ == '__main__':
    main()
