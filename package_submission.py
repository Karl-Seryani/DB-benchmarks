import os
import shutil
import zipfile
from datetime import datetime

def package_project():
    # Define paths
    base_dir = os.getcwd()
    submission_dir = os.path.join(base_dir, "submission_package")
    zip_filename = f"clickhouse_vs_elasticsearch_submission_{datetime.now().strftime('%Y%m%d')}.zip"
    
    # Create submission directory
    if os.path.exists(submission_dir):
        shutil.rmtree(submission_dir)
    os.makedirs(submission_dir)
    
    print(f"📦 Packaging project into: {submission_dir}")
    
    # 1. Copy Source Code
    src_dir = os.path.join(submission_dir, "src")
    os.makedirs(src_dir)
    
    # Copy Python scripts
    for root, dirs, files in os.walk(base_dir):
        # Skip hidden dirs, venv, and the submission dir itself
        if ".git" in root or "venv" in root or "submission_package" in root or "__pycache__" in root:
            continue
            
        for file in files:
            if file.endswith(".py") or file.endswith(".md") or file.endswith(".tex") or file.endswith(".json"):
                src_path = os.path.join(root, file)
                # Maintain directory structure relative to base
                rel_path = os.path.relpath(src_path, base_dir)
                dest_path = os.path.join(src_dir, rel_path)
                
                os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                shutil.copy2(src_path, dest_path)
                print(f"  - Copied: {rel_path}")

    # 2. Copy Results
    results_dir = os.path.join(submission_dir, "results")
    if not os.path.exists(results_dir):
        os.makedirs(results_dir)
        
    if os.path.exists(os.path.join(base_dir, "results")):
        for item in os.listdir(os.path.join(base_dir, "results")):
            src_path = os.path.join(base_dir, "results", item)
            dst_path = os.path.join(results_dir, item)
            
            if os.path.isfile(src_path):
                shutil.copy2(src_path, dst_path)
                print(f"  - Copied Result File: {item}")
            elif os.path.isdir(src_path):
                if os.path.exists(dst_path):
                    shutil.rmtree(dst_path)
                shutil.copytree(src_path, dst_path)
                print(f"  - Copied Result Dir: {item}")

    # 3. Create README for Submission
    readme_content = """
# Database Systems Project: ClickHouse vs Elasticsearch
**Student:** Karl Seryani
**Date:** November 21, 2025

## Project Overview
This project benchmarks ClickHouse and Elasticsearch for healthcare analytics workloads, using both synthetic data (100K rows) and real-world NYC Taxi data (3M rows).

## Folder Structure
- `src/`: Source code for data generation, loading, and benchmarking.
- `results/`: JSON output of benchmark runs and analysis documents.
- `report/`: LaTeX source for the final report.

## Key Findings
1. **Storage:** ClickHouse is 13.3x more storage efficient.
2. **Ingestion:** ClickHouse loads data 8.5x faster.
3. **Querying:** Elasticsearch is faster for simple lookups; ClickHouse wins on complex analytical queries (JOINs).

## How to Run
1. Install dependencies: `pip install -r requirements.txt`
2. Run benchmarks: `python3 src/benchmarks/run_benchmarks.py`
    """
    with open(os.path.join(submission_dir, "README_SUBMISSION.md"), "w") as f:
        f.write(readme_content.strip())
        
    # 4. Zip it up
    print(f"\n🤐 Zipping package...")
    shutil.make_archive(submission_dir, 'zip', submission_dir)
    
    print(f"\n✅ SUCCESS! Submission file created:\n   {submission_dir}.zip")

if __name__ == "__main__":
    package_project()
