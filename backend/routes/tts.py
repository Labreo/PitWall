"""
tts.py — FastAPI routes for the Watson TTS service.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.services.watson_tts import WatsonTTSService

router = APIRouter()
tts_service = WatsonTTSService()

class TTSRequest(BaseModel):
    text: str
    voice: str | None = None

@router.post("/synthesize")
async def synthesize_tts(payload: TTSRequest):
    """
    HTTP POST endpoint to synthesize text dynamically.
    Returns the served relative path of the pre-processed radio wav.
    """
    if not payload.text or not payload.text.strip():
        raise HTTPException(status_code=400, detail="Text field cannot be empty.")
        
    try:
        # If a custom voice is specified, temporarily override voice configuration
        orig_voice = tts_service.voice
        if payload.voice:
            tts_service.voice = payload.voice
            
        audio_url = tts_service.synthesize(payload.text)
        
        # Restore original voice
        tts_service.voice = orig_voice
        
        if not audio_url:
            raise HTTPException(status_code=500, detail="IBM Watson TTS synthesis failed or credentials are unconfigured.")
            
        return {"audio_url": audio_url}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS Route error: {str(e)}")
