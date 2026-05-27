"""
watson_tts.py — Synthesis and post-processing service for PitWall F1 Radio Audio.
"""
import os
import sys
import subprocess
import logging
import requests
from dotenv import load_dotenv
from .audio_cache import AudioCache

# Ensure Homebrew and standard local paths are in the PATH environment variable on macOS
if sys.platform == "darwin":
    for path in ["/opt/homebrew/bin", "/usr/local/bin"]:
        if path not in os.environ.get("PATH", "").split(":"):
            os.environ["PATH"] = f"{path}:{os.environ.get('PATH', '')}"

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class WatsonTTSService:
    def __init__(self):
        self.api_key = os.getenv("WATSON_TTS_API_KEY")
        
        # Normalize the base URL
        raw_url = os.getenv("WATSON_TTS_URL") or ""
        if raw_url:
            # Strip sub-paths to construct a clean service URL
            if "/v1" in raw_url:
                self.service_url = raw_url.split("/v1")[0]
            else:
                self.service_url = raw_url.rstrip("/")
        else:
            self.service_url = ""
            
        self.voice = os.getenv("WATSON_TTS_VOICE", "en-US_MichaelV3Voice")
        self.cache = AudioCache()
        
        if not self.api_key or not self.service_url:
            logger.warning("IBM Watson TTS credentials are missing. Synthesis will run in mock fallback mode.")

    def apply_radio_filter(self, raw_audio: bytes) -> bytes:
        """
        Applies a motorsport race-engineer radio filter using FFmpeg.
        """
        # FFmpeg filter:
        # 1. highpass f=350 removes bass rumble
        # 2. lowpass f=3200 restricts high-frequency hiss, giving a walkie-talkie range
        # 3. compand compresses dynamics to sound flat and punchy
        # 4. volume increases overall gain
        filter_str = (
            "highpass=f=350,"
            "lowpass=f=3000,"
            "volume=1.8,"
            "compand=attacks=0:decays=0:points=-30/-30|-20/-12|0/-4|20/-4"
        )
        
        cmd = [
            "ffmpeg",
            "-y",
            "-i", "pipe:0",           # Read from stdin
            "-af", filter_str,        # Apply audio filters
            "-f", "wav",              # Format as WAV
            "pipe:1"                  # Write to stdout
        ]
        
        try:
            process = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            out_bytes, err_bytes = process.communicate(input=raw_audio)
            
            if process.returncode != 0:
                logger.error(f"FFmpeg filtering failed (code {process.returncode}): {err_bytes.decode('utf-8', errors='ignore')}")
                return raw_audio
                
            return out_bytes
        except FileNotFoundError:
            logger.warning("FFmpeg command not found. Audio post-processing was skipped. Raw voice returned.")
            return raw_audio
        except Exception as e:
            logger.error(f"Error during FFmpeg post-processing: {e}")
            return raw_audio

    def synthesize(self, text: str) -> str | None:
        """
        Synthesizes the given coaching text.
        Saves the resulting post-processed WAV into cache and returns the relative path.
        Returns None if synthesis fails (triggering frontend Web Speech fallback).
        """
        if not text or not text.strip():
            return None

        # 1. Check Cache
        filepath, exists = self.cache.get_cached_path(self.voice, text, "wav")
        if exists:
            # We return a relative serving URL path
            return f"/data/generated_audio/{os.path.basename(filepath)}"

        # 2. Watson Call / Synthesize Fallback
        if not self.api_key or not self.service_url:
            logger.info("Watson API key absent. Skipping synthesis to trigger browser speech synthesis fallback.")
            return None

        # Build endpoint path
        synthesize_url = f"{self.service_url}/v1/synthesize"
        if "voice" not in synthesize_url:
            synthesize_url += f"?voice={self.voice}"

        headers = {
            "Content-Type": "application/json",
            "Accept": "audio/wav"
        }
        
        payload = {
            "text": text
        }

        try:
            logger.info(f"Contacting IBM Watson TTS for text: '{text}' using voice '{self.voice}'")
            response = requests.post(
                synthesize_url,
                json=payload,
                headers=headers,
                auth=("apikey", self.api_key),
                timeout=30
            )
            
            if response.status_code != 200:
                logger.error(f"IBM Watson TTS synthesis failed with status code {response.status_code}: {response.text}")
                return None
                
            raw_audio = response.content
            
            # 3. Apply Radio Filter
            filtered_audio = self.apply_radio_filter(raw_audio)
            
            # 4. Save to Cache
            cached_file = self.cache.save_to_cache(self.voice, text, filtered_audio, "wav")
            
            # Return serving path
            return f"/data/generated_audio/{os.path.basename(cached_file)}"
            
        except Exception as e:
            logger.error(f"Network error during IBM Watson TTS synthesis: {e}")
            return None
