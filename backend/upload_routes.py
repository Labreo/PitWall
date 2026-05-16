import os
import uuid
import shutil
import threading
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException
from pathlib import Path

from .processing_state import state_store, get_initial_state, ProcessingState
from .pipeline_orchestrator import PipelineOrchestrator

router = APIRouter()
UPLOAD_DIR = Path("data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/upload")
async def upload_video(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    print(f"Received upload request for file: {file.filename}")
    if not file.filename.lower().endswith(".mp4"):
        print(f"Rejected file due to extension: {file.filename}")
        raise HTTPException(status_code=400, detail="Only MP4 files are supported")
    
    session_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"{session_id}.mp4"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Initialize state
    state = get_initial_state(session_id, filename=file.filename)
    state_store[session_id] = state
    
    # Start pipeline in background
    orchestrator = PipelineOrchestrator(session_id)
    background_tasks.add_task(orchestrator.run, str(file_path))
    
    return {"session_id": session_id}

@router.get("/status/{session_id}")
async def get_status(session_id: str):
    if session_id not in state_store:
        raise HTTPException(status_code=404, detail="Session not found")
    return state_store[session_id]
