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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

