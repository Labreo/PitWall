from typing import List, Dict, Any

class CoachingTopicClassifier:
    """
    Classifies telemetry issues into specific motorsport coaching categories.
    Ensures that retrieval is targeted and deterministic.
    """
    
    TOPICS = [
        "trail braking",
        "throttle application",
        "racing line",
        "corner entry",
        "corner exit",
        "vision technique",
        "weight_transfer",
        "braking confidence",
        "steering smoothness",
        "tire loading",
        "apex timing"
    ]

    def classify_issue(self, context: Dict[str, Any]) -> str:
        """
        Maps telemetry metrics to the most relevant coaching topic.
        """
        brake = context.get("braking_aggressiveness") or 0.0
        throttle = context.get("throttle_application_quality") or 0.0
        steer = context.get("steering_stability") or 0.0
        repetition = context.get("repetition_count", 0)
        
        # Priority 1: Braking issues
        if brake < 0.6:
            if repetition == 1:
                return "vision technique"
            elif repetition >= 2:
                return "weight transfer"
            return "braking confidence"
            
        if brake < 0.8:
            if repetition == 1:
                return "tire loading"
            elif repetition >= 2:
                return "apex timing"
            return "trail braking"
            
        # Priority 2: Throttle issues
        if throttle < 0.7:
            if repetition == 1:
                return "corner exit"
            elif repetition >= 2:
                return "vision technique"
            return "throttle application"
            
        # Priority 3: Steering/Cornering
        if steer < 0.6:
            if repetition == 1:
                return "apex timing"
            elif repetition >= 2:
                return "tire loading"
            return "steering smoothness"
            
        if steer < 0.8:
            if repetition == 1:
                return "corner entry"
            elif repetition >= 2:
                return "steering smoothness"
            return "weight transfer"
            
        # Default fallback
        if repetition == 1:
            return "apex timing"
        elif repetition >= 2:
            return "tire loading"
        return "racing line apex strategy"

if __name__ == "__main__":
    classifier = CoachingTopicClassifier()
    print(classifier.classify_issue({"braking_aggressiveness": 0.75}))
