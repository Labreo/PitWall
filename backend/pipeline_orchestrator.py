import time
import logging
import json
import os
from pathlib import Path
from typing import Dict, Any, List

from .processing_state import state_store, StageStatus

# Import existing modules
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from telemetry_ingest import TelemetryIngestor
from telemetry_normalizer import TelemetryNormalizer
from lap_detector import LapDetector
from corner_segmentation import CornerSegmenter
from coaching_event_generator import CoachingEventGenerator
# Note: coaching_metrics.py is likely used inside generator or as a separate step

logger = logging.getLogger(__name__)

class PipelineOrchestrator:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.state = state_store[session_id]
        self.raw_video_path = None
        self.raw_telemetry_path = "data/raw/session_raw.json"
        self.normalized_path = "frontend/public/data/normalized_session.json"
        self.segments_path = "frontend/public/data/segments.json"
        self.laps_path = "frontend/public/data/laps.json"
        self.session_info_path = "frontend/public/data/session_info.json"
        self.coaching_output_path = "frontend/src/utils/coaching_events.json"

    def run(self, video_path: str):
        self.raw_video_path = video_path
        self.state.overall_status = StageStatus.PROCESSING
        
        try:
            # Create output directories
            os.makedirs("data/raw", exist_ok=True)
            os.makedirs("frontend/public/data", exist_ok=True)

            # 1. Extracting GoPro telemetry
            self._run_stage(0, self._extract_telemetry)
            
            # 2. Normalizing session data
            self._run_stage(1, self._normalize_data)
            
            # 3. Detecting laps
            self._run_stage(2, self._detect_laps)
            
            # 4. Segmenting corners
            self._run_stage(3, self._segment_corners)
            
            # 5. Building racing intelligence (placeholder)
            self._run_stage(4, lambda: True)
            
            # 6. Knowledge & Coaching
            self._run_stage(5, lambda: True) 
            self._run_stage(6, self._generate_coaching)
            
            # 8. Building replay session
            self._run_stage(7, self._build_replay_session)
            
            # 9. Launching replay
            self._run_stage(8, lambda: True) 
            
            self.state.overall_status = StageStatus.COMPLETED
            
        except Exception as e:
            logger.error(f"Pipeline failed at stage {self.state.current_stage_index}: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            self.state.overall_status = StageStatus.FAILED
            self.state.stages[self.state.current_stage_index].status = StageStatus.FAILED
            self.state.stages[self.state.current_stage_index].error = str(e)

    def _run_stage(self, index: int, func):
        stage = self.state.stages[index]
        self.state.current_stage_index = index
        stage.status = StageStatus.PROCESSING
        
        start_time = time.time()
        result = func()
        duration = (time.time() - start_time) * 1000
        
        stage.duration_ms = duration
        stage.status = StageStatus.COMPLETED
        return result

    def _extract_telemetry(self):
        ingestor = TelemetryIngestor()
        return ingestor.extract_from_mp4(self.raw_video_path)

    def _normalize_data(self):
        # We need to save to the specific path expected by the frontend
        output_dir = os.path.dirname(self.normalized_path)
        normalizer = TelemetryNormalizer(output_dir=output_dir)
        # The normalize method handles the filename internally as 'normalized_session.json'
        output_path, report = normalizer.normalize(self.raw_telemetry_path)
        return output_path

    def _detect_laps(self):
        import pandas as pd
        detector = LapDetector()
        with open(self.normalized_path, "r") as f:
            data = json.load(f)
        df = pd.DataFrame(data)
        laps = detector.detect_laps(df)
        with open(self.laps_path, "w") as f:
            json.dump(laps, f, indent=2)
        return laps

    def _segment_corners(self):
        import pandas as pd
        segmenter = CornerSegmenter()
        with open(self.normalized_path, "r") as f:
            data = json.load(f)
        df = pd.DataFrame(data)
        segments = segmenter.segment_track(df)
        with open(self.segments_path, "w") as f:
            json.dump(segments, f, indent=2)
        return segments

    def _generate_coaching(self):
        generator = CoachingEventGenerator()
        events = generator.run_pipeline(self.normalized_path)
        
        # Save to both paths to ensure development (static import) and production (runtime fetch) work perfectly!
        for path in [self.coaching_output_path, "frontend/public/data/coaching_events.json"]:
            try:
                os.makedirs(os.path.dirname(path), exist_ok=True)
                with open(path, "w") as f:
                    json.dump(events, f, indent=2)
                logger.info(f"Successfully saved coaching events to {path}")
            except Exception as e:
                logger.error(f"Failed to save coaching events to {path}: {e}")
                
        return events


    def _build_replay_session(self):
        # Save session metadata for the frontend
        import datetime
        date_str = datetime.datetime.now().strftime("%B %d, %Y")

        info = {
            "filename": self.state.original_filename or "Unknown Session",
            "date": date_str,
            "session_id": self.session_id
        }
        
        with open(self.session_info_path, "w") as f:
            json.dump(info, f, indent=2)

        # Automatically link/copy the uploaded video to frontend/public/session.mp4
        target_path = Path("frontend/public/session.mp4")
        if self.raw_video_path and os.path.exists(self.raw_video_path):
            try:
                # Remove existing file/symlink
                if target_path.exists() or target_path.is_symlink():
                    target_path.unlink()
                
                # Try symlinking (fast, lightweight)
                os.symlink(os.path.abspath(self.raw_video_path), os.path.abspath(target_path))
                logger.info(f"Successfully symlinked {self.raw_video_path} to {target_path}")
            except Exception as e:
                logger.warning(f"Failed to symlink {self.raw_video_path}: {e}. Falling back to copy...")
                try:
                    import shutil
                    shutil.copy2(self.raw_video_path, target_path)
                    logger.info(f"Successfully copied {self.raw_video_path} to {target_path}")
                except Exception as e2:
                    logger.error(f"Failed to copy uploaded video to {target_path}: {e2}")
            
        return True

