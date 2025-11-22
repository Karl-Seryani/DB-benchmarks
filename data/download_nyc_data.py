import os
import requests
import time

def download_file(url, dest_path):
    """Download a file with progress tracking"""
    if os.path.exists(dest_path):
        print(f"✓ {dest_path} already exists, skipping")
        return
        
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
            print(f"\r[{'=' * done}{' ' * (50-done)}] {wrote/1024/1024:.1f}/{total_size/1024/1024:.1f} MB", end='')
            
    print(f"\n✓ Download complete! Time: {time.time() - start_time:.2f}s\n")

if __name__ == "__main__":
    # Download 4 months of NYC Yellow Taxi data (Jan-Apr 2024)
    BASE_URL = "https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2024-{:02d}.parquet"
    DEST_DIR = "datasets"
    
    # Ensure directory exists
    if not os.path.exists(DEST_DIR):
        os.makedirs(DEST_DIR)
    
    print("🚕 NYC Yellow Taxi Data Downloader")
    print("=" * 60)
    print("Downloading Jan-Apr 2024 (4 months ~12M rows)")
    print("=" * 60 + "\n")
    
    # Download Jan-Apr 2024
    for month in range(1, 5):
        url = BASE_URL.format(month)
        dest_file = os.path.join(DEST_DIR, f"nyc_taxi_2024_{month:02d}.parquet")
        download_file(url, dest_file)
    
    print("\n" + "=" * 60)
    print("✓ All downloads complete!")
    print("=" * 60)
