import subprocess
import json
import logging
import os
from pathlib import Path
from typing import Dict, Any

from schemas.raw_telemetry import RawTelemetryPoint

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ExtractionError(Exception):
    pass

class TelemetryIngestor:
    def __init__(self, output_dir: str = "data/raw"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def extract_from_mp4(self, mp4_path: str) -> str:
        """
        Extracts telemetry from MP4 using gopro2json and saves raw JSON.
        Returns the path to the extracted JSON file.
        """
        video_path = Path(mp4_path)
        if not video_path.exists():
            raise FileNotFoundError(f"Video file not found: {mp4_path}")

        output_json_path = self.output_dir / f"session_raw.json"
        
        import shutil
        
        # Check dependencies
        ffmpeg_cmd = shutil.which("ffmpeg")
        if not ffmpeg_cmd:
            raise ExtractionError("ffmpeg executable not found in PATH. Please install it (e.g., 'brew install ffmpeg').")
            
        gopro2json_cmd = shutil.which("gopro2json")
        if not gopro2json_cmd:
            go_bin = os.path.expanduser("~/go/bin/gopro2json")
            if os.path.exists(go_bin):
                gopro2json_cmd = go_bin
        
        if not gopro2json_cmd:
            raise ExtractionError("gopro2json executable not found in PATH or ~/go/bin. Please install it (e.g., 'go install github.com/stilldavid/gopro-utils/bin/gopro2json@latest').")
        
        bin_path = self.output_dir / "sample.bin"
        
        logger.info(f"Extracting GPMF binary track from {mp4_path} using ffmpeg...")
        
        try:
            # Step 1: Extract .bin using ffmpeg
            # Map 0:3 is a common GoPro GPMF track, or handler_name GoPro MET
            ff_result = subprocess.run(
                [ffmpeg_cmd, "-y", "-i", str(video_path), "-codec", "copy", "-map", r"0:m:handler_name:\ \ \ \ \ GoPro\ MET", "-f", "rawvideo", str(bin_path)],
                capture_output=True,
                text=True
            )
            
            if ff_result.returncode != 0:
                # Fallback to map 0:3 if handler name fails
                ff_result_fallback = subprocess.run(
                    [ffmpeg_cmd, "-y", "-i", str(video_path), "-codec", "copy", "-map", "0:3", "-f", "rawvideo", str(bin_path)],
                    capture_output=True,
                    text=True
                )
                if ff_result_fallback.returncode != 0:
                    raise ExtractionError("No GoPro GPMF telemetry stream found. Ensure GoPro GPS was enabled during recording, or test using the verified Donington Park MP4.")
                    
            logger.info(f"Converting GPMF binary to JSON using {gopro2json_cmd}...")
            
            # Step 2: Convert .bin to .json
            result = subprocess.run(
                [gopro2json_cmd, "-i", str(bin_path), "-o", str(output_json_path)],
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                logger.warning(f"gopro2json returned non-zero. Stderr: {result.stderr}")
                raise ExtractionError("GoPro telemetry parsing failed. The GPMF binary stream was empty or could not be decoded.")

            # Clean up the intermediate bin file
            if bin_path.exists():
                os.remove(bin_path)

            logger.info(f"Successfully extracted raw telemetry to {output_json_path}")
            return str(output_json_path)

        except ExtractionError as e:
            raise e
        except Exception as e:
            raise ExtractionError(f"An unexpected error occurred during extraction: {str(e)}")

    def analyze_raw_json(self, json_path: str) -> Dict[str, Any]:
        """
        Reads the raw JSON and calculates streams, sample counts, duration, and frequency.
        """
        logger.info(f"Analyzing raw JSON: {json_path}")
        try:
            with open(json_path, "r") as f:
                data = json.load(f)
        except json.JSONDecodeError:
            raise ExtractionError("Extracted file is not valid JSON.")
            
        # GoPro telemetry JSON structures vary (gopro-telemetry vs gopro2json).
        # We will do a generic search for streams like GPS5, ACCL, GYRO.
        # Typically it's structured as a list of payloads, or a single dictionary.
        
        streams = {}
        gps_count = 0
        gps_duration = 0.0
        
        # This parsing logic is a basic heuristic for typical gopro2json output.
        # gopro2json output often has an array of objects with an '1' or 'streams' key,
        # or it could just be a flat object if we parse it differently.
        # We will try to scan through the JSON for common FourCC codes: GPS5, ACCL, GYRO
        
        # To make it robust against unknown exact schema:
        def recursive_search(node):
            if isinstance(node, dict):
                for k, v in node.items():
                    if k in ["GPS5", "ACCL", "GYRO", "CORI", "GRAV"]:
                        if k not in streams:
                            streams[k] = 0
                        # Count samples
                        if isinstance(v, list):
                            streams[k] += len(v)
                        elif isinstance(v, dict) and "samples" in v:
                            streams[k] += len(v["samples"])
                    recursive_search(v)
            elif isinstance(node, list):
                for item in node:
                    recursive_search(item)

        recursive_search(data)
        
        # If the search failed to find streams, maybe it's in a specific nested format.
        # But let's assume it found something.
        
        gps_samples = streams.get("GPS5", 0)
        # Attempt to estimate duration and frequency.
        # Without exact timestamps, we might estimate based on known GoPro rates.
        # If we can't find it, we'll return NA.
        # Usually GoPro GPS is 18Hz.
        estimated_duration = gps_samples / 18.0 if gps_samples > 0 else 0
        gps_frequency = 18.0 if gps_samples > 0 else 0.0
        
        analysis = {
            "available_streams": list(streams.keys()),
            "sample_counts": streams,
            "gps_frequency_estimate": gps_frequency,
            "telemetry_duration_sec": estimated_duration
        }
        
        return analysis

    def print_analysis(self, analysis: Dict[str, Any]):
        print("--- Telemetry Analysis ---")
        print(f"Available Streams: {', '.join(analysis['available_streams'])}")
        print("Sample Counts:")
        for stream, count in analysis['sample_counts'].items():
            print(f"  - {stream}: {count} samples")
        print(f"GPS Frequency Estimate: {analysis['gps_frequency_estimate']} Hz")
        print(f"Telemetry Duration Estimate: {analysis['telemetry_duration_sec']:.2f} seconds")
        print("--------------------------")
