import clickhouse_driver
import pandas as pd
import os
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv("../config.env")

def get_clickhouse_client():
    return clickhouse_driver.Client(
        host=os.getenv("CLICKHOUSE_HOST"),
        port=int(os.getenv("CLICKHOUSE_PORT")),
        user=os.getenv("CLICKHOUSE_USER"),
        password=os.getenv("CLICKHOUSE_PASSWORD"),
        secure=True
    )

def load_nyc_data_clickhouse():
    client = get_clickhouse_client()
    
    print("Creating ClickHouse table for NYC Taxi data...")
    
    # Create database if not exists
    client.execute("CREATE DATABASE IF NOT EXISTS healthcare_benchmark")
    
    # Drop table if exists
    client.execute("DROP TABLE IF EXISTS healthcare_benchmark.nyc_taxi")
    
    # Create table schema optimized for analytics
    create_table_query = """
    CREATE TABLE healthcare_benchmark.nyc_taxi (
        VendorID Int32,
        tpep_pickup_datetime DateTime,
        tpep_dropoff_datetime DateTime,
        passenger_count Float32,
        trip_distance Float32,
        RatecodeID Float32,
        store_and_fwd_flag String,
        PULocationID Int32,
        DOLocationID Int32,
        payment_type Int32,
        fare_amount Float32,
        extra Float32,
        mta_tax Float32,
        tip_amount Float32,
        tolls_amount Float32,
        improvement_surcharge Float32,
        total_amount Float32,
        congestion_surcharge Float32,
        Airport_fee Float32
    ) ENGINE = MergeTree()
    ORDER BY (tpep_pickup_datetime, PULocationID)
    """
    client.execute(create_table_query)
    
    print("Loading Parquet file into ClickHouse...")
    start_time = time.time()
    
    # Read Parquet file using pandas
    parquet_file = "../data/datasets/nyc_taxi_jan_2024.parquet"
    df = pd.read_parquet(parquet_file)
    
    # Handle NaN values (ClickHouse doesn't like NaNs in Int columns)
    df = df.fillna(0)
    
    # Convert timestamps to datetime objects (pandas read_parquet already does this, but ensure they are native python datetime)
    df['tpep_pickup_datetime'] = df['tpep_pickup_datetime'].dt.to_pydatetime()
    df['tpep_dropoff_datetime'] = df['tpep_dropoff_datetime'].dt.to_pydatetime()
    
    # Ensure store_and_fwd_flag is string
    df['store_and_fwd_flag'] = df['store_and_fwd_flag'].astype(str)
    
    # Insert data
    data = df.to_dict('records')
    client.execute("INSERT INTO healthcare_benchmark.nyc_taxi VALUES", data)
    
    end_time = time.time()
    duration = end_time - start_time
    row_count = len(df)
    
    print(f"✅ Loaded {row_count:,} rows into ClickHouse in {duration:.2f} seconds")
    print(f"Speed: {row_count / duration:.0f} rows/sec")

if __name__ == "__main__":
    load_nyc_data_clickhouse()
