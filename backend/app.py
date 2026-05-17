import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .upload_routes import router as upload_router

app = FastAPI(title="PitWall Upload Orchestrator")

# Mount static files for data access
app.mount("/data", StaticFiles(directory="data"), name="data")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router, prefix="/api")

@app.get("/")
async def root():
    return {"status": "PitWall Backend Online"}

import os
import shutil
import logging

logger = logging.getLogger(__name__)

def auto_setup_sample_video():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sample_paths = [
        os.path.join(root_dir, "sample.MP4"),
        os.path.join(root_dir, "sample.mp4"),
        os.path.join(root_dir, "GX013737.MP4"),
        os.path.join(root_dir, "GX013737.mp4")
    ]
    target_dir = os.path.join(root_dir, "frontend", "public")
    target_path = os.path.join(target_dir, "session.mp4")
    
    # If a real file (not a symlink) already exists, let's keep it
    if os.path.exists(target_path) and not os.path.islink(target_path):
        logger.info("session.mp4 already exists as a concrete file in frontend/public.")
        return
        
    for path in sample_paths:
        if os.path.exists(path):
            logger.info(f"Found sample video at {path}. Automatically setting up in frontend/public...")
            os.makedirs(target_dir, exist_ok=True)
            try:
                if os.path.exists(target_path) or os.path.islink(target_path):
                    os.unlink(target_path)
                os.symlink(path, target_path)
                logger.info("Successfully created symlink for session.mp4.")
                return
            except Exception as e:
                logger.warning(f"Could not symlink: {e}. Trying copy instead...")
                try:
                    shutil.copy2(path, target_path)
                    logger.info("Successfully copied session.mp4.")
                    return
                except Exception as e2:
                    logger.error(f"Failed to copy session.mp4: {e2}")

@app.on_event("startup")
async def startup_event():
    auto_setup_sample_video()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

