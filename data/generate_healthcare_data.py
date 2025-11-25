#!/usr/bin/env python3
"""
Healthcare Data Generator for ClickHouse vs Elasticsearch Benchmarks

Generates realistic synthetic healthcare data with proper relationships for JOIN testing.
Two scale tiers:
- 10M total: 2M patients, 5M events, 3M prescriptions
- 100M total: 10M patients, 60M events, 30M prescriptions
"""

import os
import sys
import random
import argparse
from datetime import datetime, timedelta
from pathlib import Path
import pyarrow as pa
import pyarrow.parquet as pq
import numpy as np
from tqdm import tqdm

# Seed for reproducibility
random.seed(42)
np.random.seed(42)

# --- Reference Data ---
CONDITIONS = [
    'Hypertension', 'Type 2 Diabetes', 'Asthma', 'COPD', 'Heart Disease',
    'Arthritis', 'Depression', 'Anxiety', 'Obesity', 'Chronic Pain',
    'Migraine', 'Allergies', 'Anemia', 'Thyroid Disorder', 'Sleep Apnea'
]

DEPARTMENTS = [
    'Emergency', 'Cardiology', 'Orthopedics', 'Neurology', 'Oncology',
    'Pediatrics', 'Psychiatry', 'Radiology', 'Surgery', 'Internal Medicine',
    'Dermatology', 'Gastroenterology', 'Pulmonology', 'Endocrinology', 'Nephrology'
]

EVENT_TYPES = [
    'Consultation', 'Lab Test', 'Imaging', 'Procedure', 'Surgery',
    'Follow-up', 'Emergency Visit', 'Therapy Session', 'Vaccination', 'Screening'
]

SEVERITIES = ['Low', 'Medium', 'High', 'Critical']

MEDICATIONS = [
    'Lisinopril', 'Metformin', 'Amlodipine', 'Metoprolol', 'Omeprazole',
    'Losartan', 'Gabapentin', 'Hydrochlorothiazide', 'Sertraline', 'Simvastatin',
    'Montelukast', 'Escitalopram', 'Rosuvastatin', 'Bupropion', 'Pantoprazole',
    'Duloxetine', 'Pravastatin', 'Clopidogrel', 'Carvedilol', 'Trazodone',
    'Fluticasone', 'Albuterol', 'Atorvastatin', 'Levothyroxine', 'Prednisone'
]

DOSAGES = ['5mg', '10mg', '20mg', '25mg', '50mg', '100mg', '250mg', '500mg']

FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'As needed', 'Weekly']

GENDERS = ['Male', 'Female', 'Other']

BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

INSURANCE_TYPES = ['Private', 'Medicare', 'Medicaid', 'Self-Pay', 'Military']


def generate_patients(num_patients: int, output_dir: Path, dataset_name: str):
    """Generate patient records"""
    print(f"\nGenerating {num_patients:,} patients...")

    batch_size = 500_000
    num_batches = (num_patients + batch_size - 1) // batch_size

    all_batches = []

    for batch_idx in tqdm(range(num_batches), desc="Patient batches"):
        start_id = batch_idx * batch_size
        end_id = min((batch_idx + 1) * batch_size, num_patients)
        batch_count = end_id - start_id

        # Generate data arrays
        patient_ids = np.arange(start_id, end_id, dtype=np.int64)
        ages = np.random.randint(1, 100, size=batch_count).astype(np.int32)
        genders = np.random.choice(GENDERS, size=batch_count)
        blood_types = np.random.choice(BLOOD_TYPES, size=batch_count)
        conditions = np.random.choice(CONDITIONS, size=batch_count)
        insurance_types = np.random.choice(INSURANCE_TYPES, size=batch_count)

        # Registration dates (last 10 years)
        base_date = datetime(2015, 1, 1)
        days_offset = np.random.randint(0, 3650, size=batch_count)
        registration_dates = [base_date + timedelta(days=int(d)) for d in days_offset]

        # Create PyArrow table
        table = pa.table({
            'patient_id': patient_ids,
            'age': ages,
            'gender': genders,
            'blood_type': blood_types,
            'primary_condition': conditions,
            'insurance_type': insurance_types,
            'registration_date': registration_dates
        })

        all_batches.append(table)

    # Concatenate all batches
    full_table = pa.concat_tables(all_batches)

    # Write to parquet
    output_file = output_dir / f'{dataset_name}_patients.parquet'
    pq.write_table(full_table, output_file, compression='snappy')
    print(f"  Written to {output_file} ({output_file.stat().st_size / 1024 / 1024:.1f} MB)")

    return num_patients


def generate_medical_events(num_events: int, num_patients: int, output_dir: Path, dataset_name: str):
    """Generate medical event records with foreign key to patients"""
    print(f"\nGenerating {num_events:,} medical events...")

    batch_size = 1_000_000
    num_batches = (num_events + batch_size - 1) // batch_size

    all_batches = []

    for batch_idx in tqdm(range(num_batches), desc="Event batches"):
        start_id = batch_idx * batch_size
        end_id = min((batch_idx + 1) * batch_size, num_events)
        batch_count = end_id - start_id

        # Generate data arrays
        event_ids = np.arange(start_id, end_id, dtype=np.int64)
        patient_ids = np.random.randint(0, num_patients, size=batch_count).astype(np.int64)
        departments = np.random.choice(DEPARTMENTS, size=batch_count)
        event_types = np.random.choice(EVENT_TYPES, size=batch_count)
        severities = np.random.choice(SEVERITIES, size=batch_count)

        # Costs with realistic distribution (log-normal)
        costs = np.round(np.random.lognormal(mean=5.5, sigma=1.2, size=batch_count), 2)
        costs = np.clip(costs, 50, 50000).astype(np.float64)

        # Duration in minutes (15 min to 8 hours)
        durations = np.random.randint(15, 480, size=batch_count).astype(np.int32)

        # Event timestamps (last 5 years, weighted towards recent)
        base_date = datetime(2020, 1, 1)
        # Use exponential distribution to weight towards recent dates
        days_offset = np.random.exponential(scale=365, size=batch_count)
        days_offset = np.clip(days_offset, 0, 1825).astype(int)  # Cap at 5 years
        timestamps = [base_date + timedelta(days=int(d), hours=np.random.randint(0, 24),
                                            minutes=np.random.randint(0, 60)) for d in days_offset]

        # Create PyArrow table
        table = pa.table({
            'event_id': event_ids,
            'patient_id': patient_ids,
            'department': departments,
            'event_type': event_types,
            'severity': severities,
            'cost_usd': costs,
            'duration_minutes': durations,
            'timestamp': timestamps
        })

        all_batches.append(table)

    # Concatenate all batches
    full_table = pa.concat_tables(all_batches)

    # Write to parquet
    output_file = output_dir / f'{dataset_name}_medical_events.parquet'
    pq.write_table(full_table, output_file, compression='snappy')
    print(f"  Written to {output_file} ({output_file.stat().st_size / 1024 / 1024:.1f} MB)")

    return num_events


def generate_prescriptions(num_prescriptions: int, num_patients: int, output_dir: Path, dataset_name: str):
    """Generate prescription records with foreign key to patients"""
    print(f"\nGenerating {num_prescriptions:,} prescriptions...")

    batch_size = 500_000
    num_batches = (num_prescriptions + batch_size - 1) // batch_size

    all_batches = []

    for batch_idx in tqdm(range(num_batches), desc="Prescription batches"):
        start_id = batch_idx * batch_size
        end_id = min((batch_idx + 1) * batch_size, num_prescriptions)
        batch_count = end_id - start_id

        # Generate data arrays
        prescription_ids = np.arange(start_id, end_id, dtype=np.int64)
        patient_ids = np.random.randint(0, num_patients, size=batch_count).astype(np.int64)
        medications = np.random.choice(MEDICATIONS, size=batch_count)
        dosages = np.random.choice(DOSAGES, size=batch_count)
        frequencies = np.random.choice(FREQUENCIES, size=batch_count)

        # Duration in days (7 to 365)
        durations = np.random.randint(7, 365, size=batch_count).astype(np.int32)

        # Refills (0 to 12)
        refills = np.random.randint(0, 13, size=batch_count).astype(np.int32)

        # Cost per prescription
        costs = np.round(np.random.lognormal(mean=3.5, sigma=0.8, size=batch_count), 2)
        costs = np.clip(costs, 5, 500).astype(np.float64)

        # Prescription dates (last 3 years)
        base_date = datetime(2022, 1, 1)
        days_offset = np.random.randint(0, 1095, size=batch_count)
        prescribed_dates = [base_date + timedelta(days=int(d)) for d in days_offset]

        # Create PyArrow table
        table = pa.table({
            'prescription_id': prescription_ids,
            'patient_id': patient_ids,
            'medication': medications,
            'dosage': dosages,
            'frequency': frequencies,
            'duration_days': durations,
            'refills': refills,
            'cost_usd': costs,
            'prescribed_date': prescribed_dates
        })

        all_batches.append(table)

    # Concatenate all batches
    full_table = pa.concat_tables(all_batches)

    # Write to parquet
    output_file = output_dir / f'{dataset_name}_prescriptions.parquet'
    pq.write_table(full_table, output_file, compression='snappy')
    print(f"  Written to {output_file} ({output_file.stat().st_size / 1024 / 1024:.1f} MB)")

    return num_prescriptions


def main():
    parser = argparse.ArgumentParser(description='Generate healthcare benchmark data')
    parser.add_argument('--scale', choices=['1m', '10m', '100m', 'all'], default='all',
                       help='Dataset scale to generate')
    parser.add_argument('--output-dir', type=str, default='datasets',
                       help='Output directory for parquet files')

    args = parser.parse_args()

    # Create output directory
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    scales = []
    if args.scale in ['1m', 'all']:
        scales.append(('healthcare_1m', 200_000, 500_000, 300_000))
    if args.scale in ['10m', 'all']:
        scales.append(('healthcare_10m', 2_000_000, 5_000_000, 3_000_000))
    if args.scale in ['100m', 'all']:
        scales.append(('healthcare_100m', 10_000_000, 60_000_000, 30_000_000))

    for dataset_name, num_patients, num_events, num_prescriptions in scales:
        print(f"\n{'='*60}")
        print(f"Generating {dataset_name} dataset")
        print(f"  Patients: {num_patients:,}")
        print(f"  Medical Events: {num_events:,}")
        print(f"  Prescriptions: {num_prescriptions:,}")
        print(f"  Total rows: {num_patients + num_events + num_prescriptions:,}")
        print(f"{'='*60}")

        dataset_dir = output_dir / dataset_name
        dataset_dir.mkdir(parents=True, exist_ok=True)

        # Generate each table
        generate_patients(num_patients, dataset_dir, dataset_name)
        generate_medical_events(num_events, num_patients, dataset_dir, dataset_name)
        generate_prescriptions(num_prescriptions, num_patients, dataset_dir, dataset_name)

        # Calculate total size
        total_size = sum(f.stat().st_size for f in dataset_dir.glob('*.parquet'))
        print(f"\nTotal dataset size: {total_size / 1024 / 1024 / 1024:.2f} GB")

    print("\n✅ Data generation complete!")
    print(f"Files saved to: {output_dir.absolute()}")


if __name__ == '__main__':
    main()
