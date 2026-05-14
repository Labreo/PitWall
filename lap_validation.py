def validate_laps(laps, min_duration=20.0, max_duration=600.0):
    """
    Validates lap objects, setting is_valid and warning messages based on thresholds.
    """
    validated = []
    for lap in laps:
        duration = lap['lap_duration_seconds']
        if duration < min_duration:
            lap['is_valid'] = False
            lap['warning'] = f"Lap too short ({duration:.1f}s < {min_duration}s)"
        elif duration > max_duration:
            lap['is_valid'] = False
            lap['warning'] = f"Lap too long ({duration:.1f}s > {max_duration}s)"
        else:
            lap['is_valid'] = True
            lap['warning'] = None
        validated.append(lap)
    return validated
