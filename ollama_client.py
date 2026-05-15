"""
ollama_client.py — Real-time local inference client for PitWall.
"""
import json
import os
import hashlib
import requests
import logging

logger = logging.getLogger(__name__)

class OllamaClient:
    def __init__(self, model="granite3.1-dense:2b", cache_path="data/processed/llm_cache.json"):
        self.model = model
        self.url = "http://localhost:11434/api/generate"
        self.cache_path = cache_path
        self.cache = self._load_cache()

    def _load_cache(self):
        if os.path.exists(self.cache_path):
            try:
                with open(self.cache_path, "r") as f:
                    return json.load(f)
            except:
                return {}
        return {}

    def _save_cache(self):
        os.makedirs(os.path.dirname(self.cache_path), exist_ok=True)
        with open(self.cache_path, "w") as f:
            json.dump(self.cache, f, indent=2)

    def generate_advice(self, prompt: str) -> dict:
        """
        Calls local Ollama instance with caching and deterministic settings.
        """
        # 1. Check Cache
        prompt_hash = hashlib.md5(prompt.encode()).hexdigest()
        if prompt_hash in self.cache:
            logger.info("Retrieved advice from local cache.")
            return self.cache[prompt_hash]

        # 2. Call Ollama
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.2,
                "num_predict": 80,
                "stop": ["\n", "User:", "Assistant:"]
            }
        }

        logger.info(f"Requesting inference from Ollama ({self.model})...")
        try:
            response = requests.post(self.url, json=payload, timeout=15)
            response.raise_for_status()
            
            result_raw = response.json().get("response", "{}")
            result = json.loads(result_raw)
            
            # 3. Store in Cache
            self.cache[prompt_hash] = result
            self._save_cache()
            return result

        except Exception as e:
            logger.error(f"Ollama inference failed: {str(e)}")
            return {
                "corner_summary": "Telemetry analysis failure.",
                "coaching_line": "Technical error in advice generation.",
                "severity": "warn",
                "confidence_reasoning": str(e)
            }
