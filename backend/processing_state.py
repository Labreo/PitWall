from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel

class StageStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class PipelineStage(BaseModel):
    id: str
    name: str
    status: StageStatus = StageStatus.PENDING
    error: Optional[str] = None
    duration_ms: Optional[float] = None

class ProcessingState(BaseModel):
    session_id: str
    original_filename: Optional[str] = None
    current_stage_index: int = 0
    stages: List[PipelineStage]
    overall_status: StageStatus = StageStatus.PENDING
    result_path: Optional[str] = None

# In-memory storage for simple local execution
state_store: Dict[str, ProcessingState] = {}

def get_initial_state(session_id: str, filename: Optional[str] = None) -> ProcessingState:
    stages = [
        PipelineStage(id="extract", name="Extracting GoPro Telemetry"),
        PipelineStage(id="normalize", name="Normalizing Session Data"),
        PipelineStage(id="laps", name="Detecting Laps"),
        PipelineStage(id="segments", name="Segmenting Corners"),
        PipelineStage(id="intelligence", name="Building Racing Intelligence"),
        PipelineStage(id="knowledge", name="Retrieving Racing Knowledge"),
        PipelineStage(id="coaching", name="Generating Coaching"),
        PipelineStage(id="serialize", name="Building Replay Session"),
        PipelineStage(id="launch", name="Launching Replay"),
    ]
    return ProcessingState(session_id=session_id, stages=stages, original_filename=filename)
