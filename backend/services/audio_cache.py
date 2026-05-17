"""
audio_cache.py — Content-addressed audio caching for pre-generated coaching lines.
"""
import os
import hashlib
import logging

logger = logging.getLogger(__name__)

CACHE_DIR = "data/generated_audio"

class AudioCache:
    def __init__(self, cache_dir: str = CACHE_DIR):
        self.cache_dir = cache_dir
        os.makedirs(self.cache_dir, exist_ok=True)
        logger.info(f"Audio cache initialized at: {self.cache_dir}")

    def get_cached_path(self, voice: str, text: str, ext: str = "wav") -> tuple[str, bool]:
        """
        Computes a content-addressed filename based on voice and text.
        Returns (filepath, exists_flag).
        """
        # Clean text to ensure uniqueness regardless of trivial spacing
        clean_text = " ".join(text.strip().lower().split())
        key = f"{voice}:{clean_text}"
        filename_hash = hashlib.md5(key.encode("utf-8")).hexdigest()
        
        filepath = os.path.join(self.cache_dir, f"{filename_hash}.{ext}")
        exists = os.path.exists(filepath) and os.path.getsize(filepath) > 0
        
        return filepath, exists

    def save_to_cache(self, voice: str, text: str, data: bytes, ext: str = "wav") -> str:
        """
        Saves raw audio bytes to the cache folder and returns the file path.
        """
        filepath, _ = self.get_cached_path(voice, text, ext)
        try:
            with open(filepath, "wb") as f:
                f.write(data)
            logger.info(f"Saved generated audio to cache: {filepath}")
        except Exception as e:
            logger.error(f"Failed to save audio to cache: {e}")
        return filepath
