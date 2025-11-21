from elasticsearch import Elasticsearch, helpers
import pandas as pd
import os
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv("../config.env")

def get_elasticsearch_client():
    host = os.getenv("ELASTICSEARCH_HOST")
    port = os.getenv("ELASTICSEARCH_PORT", "443")
    scheme = os.getenv("ELASTICSEARCH_SCHEME", "https")
    
    if not host:
        raise ValueError("ELASTICSEARCH_HOST environment variable is not set")
        
    full_url = f"{scheme}://{host}:{port}"
        
    return Elasticsearch(
        [full_url],
        basic_auth=(os.getenv("ELASTICSEARCH_USER"), os.getenv("ELASTICSEARCH_PASSWORD")),
        verify_certs=True,
        request_timeout=300
    )

def load_nyc_data_elasticsearch():
    es = get_elasticsearch_client()
    
    print("Creating Elasticsearch index for NYC Taxi data...")
    
    index_name = "nyc_taxi"
    
    # Delete index if exists
    if es.indices.exists(index=index_name):
        es.indices.delete(index=index_name)
    
    # Create index with mapping
    mapping = {
        "mappings": {
            "properties": {
                "VendorID": {"type": "integer"},
                "tpep_pickup_datetime": {"type": "date"},
                "tpep_dropoff_datetime": {"type": "date"},
                "passenger_count": {"type": "float"},
                "trip_distance": {"type": "float"},
                "RatecodeID": {"type": "float"},
                "store_and_fwd_flag": {"type": "keyword"},
                "PULocationID": {"type": "integer"},
                "DOLocationID": {"type": "integer"},
                "payment_type": {"type": "integer"},
                "fare_amount": {"type": "float"},
                "extra": {"type": "float"},
                "mta_tax": {"type": "float"},
                "tip_amount": {"type": "float"},
                "tolls_amount": {"type": "float"},
                "improvement_surcharge": {"type": "float"},
                "total_amount": {"type": "float"},
                "congestion_surcharge": {"type": "float"},
                "Airport_fee": {"type": "float"}
            }
        },
        "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 0,
            "refresh_interval": "30s"  # Optimize for bulk indexing
        }
    }
    
    es.indices.create(index=index_name, body=mapping)
    
    print("Loading Parquet file into Elasticsearch (this may take a while)...")
    start_time = time.time()
    
    # Read Parquet file
    parquet_file = "../data/datasets/nyc_taxi_jan_2024.parquet"
    df = pd.read_parquet(parquet_file)
    
    # Handle NaNs
    df = df.fillna(0)
    
    # Convert timestamps to ISO format strings
    df['tpep_pickup_datetime'] = df['tpep_pickup_datetime'].dt.strftime('%Y-%m-%dT%H:%M:%S')
    df['tpep_dropoff_datetime'] = df['tpep_dropoff_datetime'].dt.strftime('%Y-%m-%dT%H:%M:%S')
    
    # Prepare generator for bulk indexing
    def generate_actions(df):
        for _, row in df.iterrows():
            doc = row.to_dict()
            yield {
                "_index": index_name,
                "_source": doc
            }
    
    # Bulk load
    success, failed = helpers.bulk(es, generate_actions(df), chunk_size=5000, stats_only=True)
    
    # Force refresh to make documents visible
    es.indices.refresh(index=index_name)
    
    end_time = time.time()
    duration = end_time - start_time
    
    print(f"✅ Loaded {success:,} documents into Elasticsearch in {duration:.2f} seconds")
    if failed:
        print(f"⚠️ Failed to load {failed} documents")
    print(f"Speed: {success / duration:.0f} docs/sec")

if __name__ == "__main__":
    load_nyc_data_elasticsearch()
