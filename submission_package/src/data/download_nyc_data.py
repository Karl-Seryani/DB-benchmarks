import os
import requests
import time

def download_file(url, dest_path):
    """Download a file with progress tracking"""
    print(f"Downloading {url}...")
    print(f"Destination: {dest_path}")
    
    start_time = time.time()
    response = requests.get(url, stream=True)
    total_size = int(response.headers.get('content-length', 0))
    
    block_size = 1024 * 1024  # 1MB
    wrote = 0
    
    with open(dest_path, 'wb') as f:
        for data in response.iter_content(block_size):
            wrote += len(data)
            f.write(data)
            done = int(50 * wrote / total_size)
            sys.stdout.write(f"\r[{'=' * done}{' ' * (50-done)}] {wrote/1024/1024:.1f}/{total_size/1024/1024:.1f} MB")
            sys.stdout.flush()
            
    print(f"\nDownload complete! Time: {time.time() - start_time:.2f}s")

if __name__ == "__main__":
    import sys
    
    # URL for Jan 2024 Yellow Taxi Data (Parquet)
    URL = "https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2024-01.parquet"
    DEST_DIR = "datasets"
    DEST_FILE = os.path.join(DEST_DIR, "nyc_taxi_jan_2024.parquet")
    
    # Ensure directory exists
    if not os.path.exists(DEST_DIR):
        os.makedirs(DEST_DIR)
        
    download_file(URL, DEST_FILE)
