def classify_segment(segment):
    """
    Classify a corner segment based on heading change and average speed.
    """
    if segment['segment_type'] == 'straight':
        return 'Straight'
        
    heading_change = segment['heading_change_degrees']
    abs_heading = abs(heading_change)
    avg_speed = segment['average_speed']
    duration = segment['duration_seconds']
    
    # Determine direction
    direction = "Right" if heading_change > 0 else "Left"
    
    # If the net heading change is very small but the segment duration is long,
    # it indicates consecutive opposite corners canceling each other out (S-bend / Chicane)
    if abs_heading < 30 and duration > 2.5:
        return "Compound Chicane"
    
    # Standard Classifications
    if abs_heading > 120 and avg_speed < 80:
        return f"{direction} Hairpin"
    elif abs_heading > 45 and avg_speed < 120:
        return f"{direction} Medium-speed Corner"
    elif abs_heading >= 10 and avg_speed >= 120:
        return f"{direction} High-speed Kink"
    elif abs_heading >= 10:
        return f"{direction} Corner"
    else:
        return "Compound Chicane"
