import os
import sys
import time
import subprocess

# Ensure python-dotenv is installed
try:
    import dotenv
except ImportError:
    print("📦 Installing required package: python-dotenv...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "python-dotenv"])
        print("✅ Installed python-dotenv")
    except Exception as e:
        print(f"❌ Failed to install python-dotenv: {e}")
        print("Please run: pip install python-dotenv")
        time.sleep(3)

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def print_header():
    clear_screen()
    print("="*60)
    print("   CLICKHOUSE vs ELASTICSEARCH BENCHMARK RUNNER")
    print("="*60)
    print("\nAvailable Datasets:")
    
    has_synthetic = os.path.exists("../data/datasets/medical_events.csv")
    has_nyc = os.path.exists("../data/datasets/nyc_taxi_jan_2024.parquet")
    
    print(f"  1. Synthetic Healthcare Data (100K rows) [{'✅ Ready' if has_synthetic else '❌ Missing'}]")
    print(f"  2. NYC Taxi Data (3 Million rows)        [{'✅ Ready' if has_nyc else '❌ Missing'}]")
    print("  3. Run ALL Benchmarks")
    print("  4. Exit")
    print("-" * 60)

def run_synthetic():
    print("\n🚀 Starting Synthetic Data Benchmarks...")
    time.sleep(1)
    os.system(f'"{sys.executable}" run_benchmarks.py')
    input("\nPress Enter to continue...")

def run_nyc():
    print("\n🚖 Starting NYC Taxi Benchmarks...")
    time.sleep(1)
    os.system(f'"{sys.executable}" run_nyc_benchmarks.py')
    input("\nPress Enter to continue...")

def main():
    while True:
        print_header()
        choice = input("\nEnter your choice (1-4): ").strip()
        
        if choice == '1':
            run_synthetic()
        elif choice == '2':
            run_nyc()
        elif choice == '3':
            run_synthetic()
            run_nyc()
        elif choice == '4':
            print("\nExiting... Goodbye! 👋")
            sys.exit(0)
        else:
            print("\n❌ Invalid choice. Please try again.")
            time.sleep(1)

if __name__ == "__main__":
    # Ensure we are in the benchmarks directory
    if not os.getcwd().endswith("benchmarks"):
        if os.path.exists("benchmarks"):
            os.chdir("benchmarks")
        else:
            print("Error: Please run this script from the project root or benchmarks directory.")
            sys.exit(1)
            
    main()
