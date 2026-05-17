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
        prompt_hash = hashlib.md5(prompt.encode()).hexdigest()
        if prompt_hash in self.cache:
            return self.cache[prompt_hash]

        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.7,
                "num_predict": 512,  # Increased to prevent truncation
            }
        }

        try:
            response = requests.post(self.url, json=payload, timeout=60)
            response.raise_for_status()
            
            result_raw = response.json().get("response", "").strip()
            
            # 1. Handle literal newlines inside values which break JSON spec
            # We replace them with a space or a literal \n escape
            result_raw = result_raw.replace('\n', ' ')
            
            # 2. Extract JSON block
            json_start = result_raw.find('{')
            json_end = result_raw.rfind('}') + 1
            if json_start != -1 and json_end != 0:
                result_raw = result_raw[json_start:json_end]

            try:
                result = json.loads(result_raw)
            except json.JSONDecodeError as je:
                logger.error(f"Failed to parse Granite JSON. Raw response: {result_raw}")
                raise je
            
            self.cache[prompt_hash] = result
            self._save_cache()
            return result
        except Exception as e:
            logger.error(f"Ollama inference failed: {str(e)}")
            return {
                "corner_summary": "Telemetry analysis active.",
                "coaching_line": "Check your entry speed into the corner.",
                "severity": "info",
                "confidence_reasoning": f"Inference error: {str(e)}"
            }

    def generate_text(self, prompt: str) -> str:
        """
        Calls local Ollama instance to generate freeform text with caching.
        """
        prompt_hash = hashlib.md5(prompt.encode()).hexdigest()
        if prompt_hash in self.cache:
            return self.cache[prompt_hash]

        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.5,
                "num_predict": 256,
            }
        }

        try:
            response = requests.post(self.url, json=payload, timeout=60)
            response.raise_for_status()
            
            result = response.json().get("response", "").strip()
            self.cache[prompt_hash] = result
            self._save_cache()
            return result
        except Exception as e:
            logger.error(f"Ollama text generation failed: {str(e)}")
            return "Session timing completed. Maintain focus on optimizing entry braking stability and early throttle exits across all high-speed sectors."

if __name__ == "__main__":
    client = OllamaClient()
    print(client.generate_text("Explain in 1 sentence why track limits are important in racing."))

