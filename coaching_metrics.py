"""
coaching_metrics.py — Pure scoring functions for corner telemetry analysis.

All functions are deterministic: same inputs → same outputs.
No I/O, no state, no randomness.
"""

from __future__ import annotations

from typing import Any

from corner_analysis import (
    TelemetryPoint,
    clamp,
    compute_mean,
    compute_std,
    extract_entry_phase,
    extract_exit_phase,
    extract_field_values,
    has_field,
)


# ---------------------------------------------------------------------------
# Sensor path identifiers (returned alongside scores for confidence weighting)
# ---------------------------------------------------------------------------
PATH_SENSOR   = "sensor"       # direct hardware reading
PATH_LONGIT_G = "longit_g"     # longitudinal G proxy
PATH_SPEED    = "speed_delta"  # speed-only fallback
PATH_LATERAL  = "lateral_g"    # lateral G proxy
PATH_INFERRED = "inferred"     # speed-delta exit inference
PATH_ABSENT   = "absent"       # field missing, metric omitted


SENSOR_CONFIDENCE: dict[str, float] = {
    PATH_SENSOR:   1.00,
    PATH_LONGIT_G: 0.85,
    PATH_LATERAL:  0.70,
    PATH_INFERRED: 0.55,
    PATH_SPEED:    0.60,
    PATH_ABSENT:   0.00,
}


# ---------------------------------------------------------------------------
# 1. Braking Aggressiveness [0–1]
# ---------------------------------------------------------------------------

def score_braking_aggressiveness(
    points: list[TelemetryPoint],
    entry_speed: float | None,
    min_speed: float | None,
) -> tuple[float, str]:
    """Return (score, path) where path identifies the signal source."""
    entry = extract_entry_phase(points)

    # Path A — brake sensor
    if has_field(entry, "brake_pct"):
        values = extract_field_values(entry, "brake_pct")
        return clamp(max(values), 0.0, 1.0), PATH_SENSOR

    # Path B — longitudinal G
    if has_field(entry, "longitudinal_g"):
        values = extract_field_values(entry, "longitudinal_g")
        min_g = min(values)  # most negative = hardest braking
        return clamp(abs(min_g) / 3.5, 0.0, 1.0), PATH_LONGIT_G

    # Path C — speed delta
    if entry_speed is not None and min_speed is not None:
        delta = entry_speed - min_speed
        return clamp(delta / 120.0, 0.0, 1.0), PATH_SPEED

    return 0.5, PATH_ABSENT  # neutral placeholder


# ---------------------------------------------------------------------------
# 2. Throttle Application Quality [0–1]
# ---------------------------------------------------------------------------

def score_throttle_application_quality(
    points: list[TelemetryPoint],
    min_speed: float | None,
    exit_speed: float | None,
) -> tuple[float, str]:
    """Smoothness and timing of throttle pickup in exit zone."""
    exit_phase = extract_exit_phase(points)
    if not exit_phase:
        return 0.5, PATH_ABSENT

    # Path A — throttle sensor
    if has_field(exit_phase, "throttle_pct"):
        values = extract_field_values(exit_phase, "throttle_pct")
        if len(values) < 2:
            return 0.5, PATH_SENSOR

        n = len(values)
        application_rate = (values[-1] - values[0]) / n
        oscillation_penalty = compute_std(values) * 2.0
        pickup_timing_bonus = 1.0 if values[0] > 0.05 else 0.0

        score = (
            0.5 * clamp(application_rate / 0.10, 0.0, 1.0)
            + 0.3 * clamp(1.0 - oscillation_penalty, 0.0, 1.0)
            + 0.2 * pickup_timing_bonus
        )
        return clamp(score, 0.0, 1.0), PATH_SENSOR

    # Path B — speed delta in exit zone (driver accelerating = positive)
    if min_speed is not None and exit_speed is not None:
        exit_speeds = extract_field_values(exit_phase, "speed_kmh")
        if len(exit_speeds) < 2:
            return 0.5, PATH_INFERRED

        # Smooth, positive acceleration is ideal
        speed_gain = exit_speeds[-1] - exit_speeds[0]
        std_exit = compute_std(exit_speeds)

        application_score = clamp(speed_gain / 60.0, 0.0, 1.0)      # 60 km/h gain over exit = full
        stability_score = clamp(1.0 - std_exit / 30.0, 0.0, 1.0)    # low variance = smooth

        score = 0.6 * application_score + 0.4 * stability_score
        return clamp(score, 0.0, 1.0), PATH_INFERRED

    return 0.5, PATH_ABSENT


# ---------------------------------------------------------------------------
# 3. Steering Stability [0–1]
# ---------------------------------------------------------------------------

def score_steering_stability(points: list[TelemetryPoint]) -> tuple[float, str]:
    """Absence of mid-corner steering corrections."""

    # Path A — steering angle sensor
    if has_field(points, "steering_angle_deg"):
        angles = extract_field_values(points, "steering_angle_deg")
        if len(angles) < 3:
            return 0.5, PATH_SENSOR

        diffs = [angles[i + 1] - angles[i] for i in range(len(angles) - 1)]
        sign_changes = sum(
            1 for i in range(len(diffs) - 1)
            if diffs[i] * diffs[i + 1] < 0
        )
        total_travel = sum(abs(d) for d in diffs)
        initial_steer = abs(angles[0]) if abs(angles[0]) > 1e-6 else 10.0

        correction_ratio = sign_changes / len(angles)
        travel_ratio = total_travel / initial_steer

        score = (
            0.6 * clamp(1.0 - correction_ratio * 3.0, 0.0, 1.0)
            + 0.4 * clamp(1.0 - (travel_ratio - 1.0) / 4.0, 0.0, 1.0)
        )
        return clamp(score, 0.0, 1.0), PATH_SENSOR

    # Path B — lateral G variance
    if has_field(points, "lateral_g"):
        values = extract_field_values(points, "lateral_g")
        lat_std = compute_std(values)
        # Low variance lateral G = smooth cornering arc
        score = clamp(1.0 - lat_std * 2.0, 0.0, 1.0)
        return score, PATH_LATERAL

    return 0.5, PATH_ABSENT


# ---------------------------------------------------------------------------
# 4. Apex Consistency Score [0–1, cross-lap]
# ---------------------------------------------------------------------------

def score_apex_consistency(apex_speeds_per_lap: list[float]) -> float | None:
    """Coefficient of variation of apex speeds across laps.

    Returns None if fewer than 2 laps available.
    """
    if len(apex_speeds_per_lap) < 2:
        return None

    mean_apex = compute_mean(apex_speeds_per_lap)
    if mean_apex < 1.0:
        return None  # degenerate

    std_apex = compute_std(apex_speeds_per_lap)
    cv = std_apex / mean_apex

    # CV ≤ 0.02 is near-perfect; CV ≥ 0.15 is highly inconsistent
    return clamp(1.0 - cv / 0.15, 0.0, 1.0)


def lap_count_confidence_weight(n_laps: int) -> float:
    """Confidence weight for cross-lap metrics based on sample count."""
    if n_laps >= 4:
        return 1.00
    if n_laps == 3:
        return 0.85
    if n_laps == 2:
        return 0.65
    return 0.00  # 1 lap: cross-lap metrics undefined


# ---------------------------------------------------------------------------
# 5. Time Loss vs Best Lap [float, seconds]
# ---------------------------------------------------------------------------

def compute_time_loss(
    current_corner_time_s: float | None,
    best_corner_time_s: float | None,
) -> float | None:
    if current_corner_time_s is None or best_corner_time_s is None:
        return None
    return round(current_corner_time_s - best_corner_time_s, 4)


# ---------------------------------------------------------------------------
# 6. Confidence Score [0–1]
# ---------------------------------------------------------------------------

def compute_confidence(
    points: list[TelemetryPoint],
    braking_path: str,
    throttle_path: str,
    steering_path: str,
    n_laps: int,
    entry_speed: float | None,
    min_speed: float | None,
    exit_speed: float | None,
) -> float:
    """Aggregate data quality gate [0–1].

    Low confidence → emit but suppress coaching.
    """
    # Sensor path quality: worst of the three primary metrics
    sensor_weights = [
        SENSOR_CONFIDENCE.get(braking_path, 0.5),
        SENSOR_CONFIDENCE.get(throttle_path, 0.5),
        SENSOR_CONFIDENCE.get(steering_path, 0.5),
    ]
    sensor_quality = sum(sensor_weights) / len(sensor_weights)

    # Sample count: ≥10 points ideal, linear below
    sample_weight = clamp(len(points) / 10.0, 0.0, 1.0)

    # Cross-lap quality
    lap_weight = lap_count_confidence_weight(n_laps)

    # Speed sanity: entry > min AND min < exit
    speed_plausible = 1.0
    if entry_speed is not None and min_speed is not None and exit_speed is not None:
        if not (entry_speed > min_speed and min_speed < exit_speed):
            speed_plausible = 0.3

    score = (
        0.45 * sensor_quality
        + 0.25 * sample_weight
        + 0.20 * lap_weight
        + 0.10 * speed_plausible
    )
    return round(clamp(score, 0.0, 1.0), 4)


# ---------------------------------------------------------------------------
# 7. Coaching Priority
# ---------------------------------------------------------------------------

def determine_coaching_priority(
    braking_aggressiveness: float,
    throttle_application_quality: float,
    steering_stability: float,
    apex_consistency_score: float | None,
    time_loss_vs_best_lap: float | None,
) -> str:
    """First-match decision tree. Returns 'critical', 'warn', or 'info'."""

    # Critical: overcooking entry AND asleep on exit
    if braking_aggressiveness > 0.85 and throttle_application_quality < 0.40:
        return "critical"

    # Critical: significant time loss
    if time_loss_vs_best_lap is not None and time_loss_vs_best_lap > 0.50:
        return "critical"

    # Warn: any single metric out of range
    if braking_aggressiveness > 0.70:
        return "warn"
    if throttle_application_quality < 0.55:
        return "warn"
    if steering_stability < 0.50:
        return "warn"
    if apex_consistency_score is not None and apex_consistency_score < 0.40:
        return "warn"
    if time_loss_vs_best_lap is not None and time_loss_vs_best_lap > 0.20:
        return "warn"

    return "info"
