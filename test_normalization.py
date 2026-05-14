import sys
import logging
from telemetry_normalizer import TelemetryNormalizer

class Color:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

logging.basicConfig(level=logging.INFO, format=f'{Color.OKCYAN}%(asctime)s - %(levelname)s - %(message)s{Color.ENDC}')

def main():
    if len(sys.argv) < 2:
        print("Usage: python test_normalization.py <path_to_raw_json>")
        sys.exit(1)
        
    raw_path = sys.argv[1]
    
    normalizer = TelemetryNormalizer(output_dir="data/processed")
    
    try:
        output_file, report = normalizer.normalize(raw_path)
        
        print(f"\n{Color.HEADER}{Color.BOLD}## NORMALIZATION SUMMARY{Color.ENDC}\n")
        print(f"Output File: {output_file}")
        print(f"Total Samples: {report['total_samples']}")
        print(f"Duration: {report['duration_sec']:.1f}s")
        
        print(f"\n{Color.HEADER}{Color.BOLD}## FREQUENCY REPORT{Color.ENDC}\n")
        print(f"Target Frequency: {report['target_frequency_hz']}Hz")
        actual_freq = 1000.0 / report['actual_frequency_ms'] if report['actual_frequency_ms'] > 0 else 0
        print(f"Actual Average Interval: {report['actual_frequency_ms']:.2f}ms (~{actual_freq:.1f}Hz)")
        
        print(f"\n{Color.HEADER}{Color.BOLD}## MISSING DATA REPORT{Color.ENDC}\n")
        for col, pct in report['missing_data_percentages'].items():
            if pct > 0:
                print(f"{Color.WARNING}- {col}: {pct:.2f}% missing{Color.ENDC}")
            else:
                print(f"{Color.OKGREEN}- {col}: 0.00% missing{Color.ENDC}")
                
        print(f"\n{Color.OKGREEN}{Color.BOLD}✓ Normalization Complete{Color.ENDC}\n")
        
    except Exception as e:
        logging.error(f"{Color.FAIL}Failed to normalize telemetry: {e}{Color.ENDC}")
        sys.exit(1)

if __name__ == "__main__":
    main()
