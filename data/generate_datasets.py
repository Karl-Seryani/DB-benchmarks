"""
Synthetic Healthcare Data Generator
Generates realistic medical event logs, patient data, and IoT telemetry for benchmarking
"""

import random
import csv
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict
import uuid

# Configuration
RANDOM_SEED = 42
random.seed(RANDOM_SEED)

# Medical event types
EVENT_TYPES = [
    'patient_admission', 'patient_discharge', 'vitals_check', 
    'medication_administered', 'lab_test_ordered', 'lab_result_received',
    'imaging_ordered', 'imaging_completed', 'consultation_scheduled',
    'consultation_completed', 'procedure_scheduled', 'procedure_completed'
]

# Departments
DEPARTMENTS = [
    'Emergency', 'ICU', 'Cardiology', 'Neurology', 'Oncology',
    'Pediatrics', 'Surgery', 'Radiology', 'Laboratory', 'Pharmacy'
]

# Medical conditions
CONDITIONS = [
    'Hypertension', 'Diabetes Type 2', 'Asthma', 'COPD', 'Heart Disease',
    'Cancer', 'Kidney Disease', 'Arthritis', 'Depression', 'Anxiety',
    'Pneumonia', 'COVID-19', 'Influenza', 'Sepsis', 'Stroke'
]

# Device types for IoT telemetry
DEVICE_TYPES = [
    'heart_rate_monitor', 'blood_pressure_monitor', 'pulse_oximeter',
    'ventilator', 'infusion_pump', 'glucose_monitor', 'temperature_sensor'
]


class HealthcareDataGenerator:
    def __init__(self, output_dir: str = "datasets"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        self.patients = []
        self.devices = []
        
    def generate_patients(self, num_patients: int = 1_000_000) -> List[Dict]:
        """Generate synthetic patient records"""
        print(f"Generating {num_patients:,} patient records...")
        
        patients = []
        for i in range(num_patients):
            patient = {
                'patient_id': f'PT{i:08d}',
                'age': random.randint(0, 100),
                'gender': random.choice(['M', 'F', 'Other']),
                'primary_condition': random.choice(CONDITIONS),
                'registration_date': self._random_date(2020, 2024).isoformat(),
                'risk_score': round(random.uniform(0, 100), 2)
            }
            patients.append(patient)
            
            if (i + 1) % 100000 == 0:
                print(f"  Generated {i + 1:,} patients...")
        
        self.patients = patients
        return patients
    
    def generate_events(self, num_events: int = 100_000_000) -> List[Dict]:
        """Generate synthetic medical events"""
        print(f"Generating {num_events:,} medical events...")
        
        if not self.patients:
            raise ValueError("Generate patients first!")
        
        events = []
        start_date = datetime(2023, 1, 1)
        
        for i in range(num_events):
            patient = random.choice(self.patients)
            event_date = start_date + timedelta(
                seconds=random.randint(0, 365 * 24 * 60 * 60)
            )
            
            event = {
                'event_id': f'EV{i:010d}',
                'patient_id': patient['patient_id'],
                'event_type': random.choice(EVENT_TYPES),
                'department': random.choice(DEPARTMENTS),
                'timestamp': event_date.isoformat(),
                'duration_minutes': random.randint(5, 480),
                'severity': random.choice(['Low', 'Medium', 'High', 'Critical']),
                'cost_usd': round(random.uniform(50, 5000), 2)
            }
            events.append(event)
            
            if (i + 1) % 10000000 == 0:
                print(f"  Generated {i + 1:,} events...")
        
        return events
    
    def generate_iot_telemetry(self, num_readings: int = 50_000_000) -> List[Dict]:
        """Generate synthetic IoT device telemetry"""
        print(f"Generating {num_readings:,} IoT telemetry readings...")
        
        if not self.patients:
            raise ValueError("Generate patients first!")
        
        # Create devices
        if not self.devices:
            print("  Creating device registry...")
            num_devices = min(len(self.patients) // 10, 100000)
            self.devices = [
                {
                    'device_id': f'DEV{i:06d}',
                    'device_type': random.choice(DEVICE_TYPES),
                    'patient_id': random.choice(self.patients)['patient_id']
                }
                for i in range(num_devices)
            ]
        
        readings = []
        start_date = datetime(2023, 1, 1)
        
        for i in range(num_readings):
            device = random.choice(self.devices)
            reading_time = start_date + timedelta(
                seconds=random.randint(0, 365 * 24 * 60 * 60)
            )
            
            # Generate realistic values based on device type
            value = self._generate_reading_value(device['device_type'])
            
            reading = {
                'reading_id': f'RD{i:010d}',
                'device_id': device['device_id'],
                'patient_id': device['patient_id'],
                'device_type': device['device_type'],
                'timestamp': reading_time.isoformat(),
                'value': value,
                'unit': self._get_unit(device['device_type']),
                'is_abnormal': random.random() < 0.15  # 15% abnormal readings
            }
            readings.append(reading)
            
            if (i + 1) % 10000000 == 0:
                print(f"  Generated {i + 1:,} readings...")
        
        return readings
    
    def save_to_csv(self, data: List[Dict], filename: str):
        """Save data to CSV file"""
        filepath = self.output_dir / filename
        print(f"Saving to {filepath}...")
        
        if not data:
            print("  No data to save!")
            return
        
        with open(filepath, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=data[0].keys())
            writer.writeheader()
            writer.writerows(data)
        
        print(f"  Saved {len(data):,} records")
    
    def save_to_json(self, data: List[Dict], filename: str):
        """Save data to JSON file"""
        filepath = self.output_dir / filename
        print(f"Saving to {filepath}...")
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        
        print(f"  Saved {len(data):,} records")
    
    def _random_date(self, start_year: int, end_year: int) -> datetime:
        """Generate random date between years"""
        start = datetime(start_year, 1, 1)
        end = datetime(end_year, 12, 31)
        delta = end - start
        random_days = random.randint(0, delta.days)
        return start + timedelta(days=random_days)
    
    def _generate_reading_value(self, device_type: str) -> float:
        """Generate realistic sensor readings based on device type"""
        ranges = {
            'heart_rate_monitor': (60, 100),
            'blood_pressure_monitor': (80, 120),
            'pulse_oximeter': (95, 100),
            'ventilator': (12, 20),
            'infusion_pump': (0.1, 10.0),
            'glucose_monitor': (70, 140),
            'temperature_sensor': (36.5, 37.5)
        }
        min_val, max_val = ranges.get(device_type, (0, 100))
        return round(random.uniform(min_val, max_val), 2)
    
    def _get_unit(self, device_type: str) -> str:
        """Get measurement unit for device type"""
        units = {
            'heart_rate_monitor': 'bpm',
            'blood_pressure_monitor': 'mmHg',
            'pulse_oximeter': '%',
            'ventilator': 'breaths/min',
            'infusion_pump': 'mL/hr',
            'glucose_monitor': 'mg/dL',
            'temperature_sensor': '°C'
        }
        return units.get(device_type, 'unit')


def main():
    """
    Main function to generate datasets
    
    Usage:
    - For small test dataset: python generate_datasets.py --size small
    - For full dataset: python generate_datasets.py --size full
    """
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate synthetic healthcare data')
    parser.add_argument('--size', choices=['small', 'medium', 'full'], default='small',
                      help='Dataset size: small (test), medium (dev), or full (production)')
    parser.add_argument('--format', choices=['csv', 'json', 'both'], default='csv',
                      help='Output format')
    
    args = parser.parse_args()
    
    # Define sizes
    sizes = {
        'small': {
            'patients': 10_000,
            'events': 100_000,
            'telemetry': 50_000
        },
        'medium': {
            'patients': 100_000,
            'events': 10_000_000,
            'telemetry': 5_000_000
        },
        'full': {
            'patients': 1_000_000,
            'events': 100_000_000,
            'telemetry': 50_000_000
        }
    }
    
    config = sizes[args.size]
    print(f"\n=== Generating {args.size.upper()} dataset ===\n")
    
    generator = HealthcareDataGenerator()
    
    # Generate patients
    patients = generator.generate_patients(config['patients'])
    if args.format in ['csv', 'both']:
        generator.save_to_csv(patients, 'patients.csv')
    if args.format in ['json', 'both']:
        generator.save_to_json(patients[:1000], 'patients_sample.json')  # Sample only for JSON
    
    # Generate events
    events = generator.generate_events(config['events'])
    if args.format in ['csv', 'both']:
        generator.save_to_csv(events, 'medical_events.csv')
    if args.format in ['json', 'both']:
        generator.save_to_json(events[:1000], 'medical_events_sample.json')
    
    # Generate IoT telemetry
    telemetry = generator.generate_iot_telemetry(config['telemetry'])
    if args.format in ['csv', 'both']:
        generator.save_to_csv(telemetry, 'iot_telemetry.csv')
    if args.format in ['json', 'both']:
        generator.save_to_json(telemetry[:1000], 'iot_telemetry_sample.json')
    
    print("\n=== Dataset generation complete! ===\n")
    print(f"Patients: {config['patients']:,}")
    print(f"Events: {config['events']:,}")
    print(f"Telemetry readings: {config['telemetry']:,}")
    print(f"\nFiles saved in: {generator.output_dir.absolute()}")


if __name__ == '__main__':
    main()
