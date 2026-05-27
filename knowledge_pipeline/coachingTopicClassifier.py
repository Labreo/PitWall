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
        "weight transfer",
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
        time_loss = context.get("time_loss_vs_best_lap") or 0.0
        repetition = context.get("repetition_count", 0)

        # Calculate deviations from optimal driver inputs
        # Too aggressive or too late braking
        brake_too_hard_dev = max(0.0, brake - 0.75)
        # Under-braking or braking too early (leading to significant time loss)
        brake_too_soft_dev = max(0.0, 0.45 - brake) if time_loss > 0.1 else 0.0
        # Hesitant or delayed throttle exit
        throttle_dev = max(0.0, 0.75 - throttle)
        # Steering corrections or mid-corner instability
        steering_dev = max(0.0, 0.65 - steer)

        # Build deviation comparison
        devs = {
            "brake_hard": brake_too_hard_dev,
            "brake_soft": brake_too_soft_dev,
            "throttle": throttle_dev,
            "steering": steering_dev
        }
        
        # Identify primary driver issue by highest deviation
        sorted_issues = sorted(devs.items(), key=lambda item: item[1], reverse=True)
        primary_issue, primary_val = sorted_issues[0]

        # If deviations are small or negligible, fall back to apex / line strategy
        if primary_val < 0.05:
            apex_consistency = context.get("apex_consistency_score")
            if apex_consistency is not None and apex_consistency < 0.50:
                primary_issue = "apex_consistency"
            else:
                primary_issue = "fallback"

        # Map the primary issue to a topic query, rotating using repetition to keep advice fresh!
        if primary_issue == "brake_hard":
            topics = [
                "trail braking release entry speed turn in",
                "late braking markers lock up deceleration control",
                "grip circle limit tyre friction driver input smooth release"
            ]
            return topics[repetition % len(topics)]
            
        elif primary_issue == "brake_soft":
            topics = [
                "braking confidence reference markers braking zone",
                "corner entry deceleration control momentum maintenance",
                "weight transfer braking nose down front grip steer response"
            ]
            return topics[repetition % len(topics)]
            
        elif primary_issue == "throttle":
            topics = [
                "throttle application smooth exit acceleration",
                "corner exit traction track out acceleration",
                "weight transfer throttle rear load grip distribution"
            ]
            return topics[repetition % len(topics)]
            
        elif primary_issue == "steering":
            topics = [
                "steering smoothness mid corner corrections stable arc",
                "racing line late geometric apex turn in",
                "vision technique looking ahead through apex to exit"
            ]
            return topics[repetition % len(topics)]
            
        elif primary_issue == "apex_consistency":
            topics = [
                "apex timing consistency entry speed",
                "racing line apex strategy geometric center"
            ]
            return topics[repetition % len(topics)]
            
        else: # fallback / racing line optimization
            topics = [
                "racing line apex strategy geometric center",
                "vision technique looking ahead through apex to exit",
                "grip circle limit friction smooth transitions"
            ]
            return topics[repetition % len(topics)]

if __name__ == "__main__":
    classifier = CoachingTopicClassifier()
    print(classifier.classify_issue({"braking_aggressiveness": 0.75}))
