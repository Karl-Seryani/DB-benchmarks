import pandas as pd
import os

# Path to the downloaded file
file_path = "data/datasets/nyc_taxi_jan_2024.parquet"

print(f"Inspecting file: {file_path}")
print(f"File size: {os.path.getsize(file_path) / (1024*1024):.2f} MB")

try:
    # Read the parquet file
    df = pd.read_parquet(file_path)
    
    # Get exact row count
    row_count = len(df)
    
    print("\n" + "="*40)
    print(f"✅ ROW COUNT: {row_count:,}")
    print("="*40)
    
    print("\nFirst 5 rows:")
    print(df.head().to_string())
    
    print("\nColumns:")
    print(df.columns.tolist())

except Exception as e:
    print(f"\n❌ Error reading file: {e}")
