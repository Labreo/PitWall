"""
corner_analysis.py — Telemetry slicing and signal extraction per corner segment.

All functions are pure: no I/O, no side effects, deterministic output.
"""

from __future__ import annotations

import math
from typing import Any


TelemetryPoint = dict[str, Any]
Segment = dict[str, Any]
Lap = dict[str, Any]


def classify_corner_type(segment: Segment) -> str:
    """Classify corner as heavy_braking / medium / light.

    Uses heading_change_degrees if available; falls back to average_speed.
    """
    heading = segment.get("heading_change_degrees")
    if heading is not None:
        abs_h = abs(heading)
        if abs_h >= 90:
            return "heavy_braking"
        if abs_h >= 60:
            return "medium"
        return "light"

    avg_speed = segment.get("average_speed", 150.0)
    if avg_speed < 100:
        return "heavy_braking"
    if avg_speed < 150:
        return "medium"
    return "light"


def slice_telemetry_for_corner(
    telemetry: list[TelemetryPoint],
    segment: Segment,
    lap: Lap,
) -> list[TelemetryPoint]:
    """Extract telemetry points that fall within segment bounds on a given lap.

    Timestamps are intersected: segment bounds AND lap bounds, so we only
    return points that belong to this corner on this specific lap crossing.
    """
    seg_start = segment["start_timestamp"]
    seg_end = segment["end_timestamp"]
    lap_start = lap["start_timestamp"]
    lap_end = lap["end_timestamp"]

    window_start = max(seg_start, lap_start)
    window_end = min(seg_end, lap_end)

    if window_start >= window_end:
        return []

    return [
        pt for pt in telemetry
        if window_start <= pt["timestamp"] <= window_end
    ]


def extract_entry_phase(points: list[TelemetryPoint]) -> list[TelemetryPoint]:
    """First third of corner slice — braking zone."""
    if not points:
        return []
    boundary = max(1, len(points) // 3)
    return points[:boundary]


def extract_exit_phase(points: list[TelemetryPoint]) -> list[TelemetryPoint]:
    """Final third of corner slice — throttle application zone."""
    if not points:
        return []
    boundary = max(1, (len(points) * 2) // 3)
    return points[boundary:]


def extract_apex_region(points: list[TelemetryPoint]) -> list[TelemetryPoint]:
    """Middle third of corner slice — apex zone."""
    if not points:
        return []
    start = max(1, len(points) // 3)
    end = max(start + 1, (len(points) * 2) // 3)
    return points[start:end]


def find_apex_index(points: list[TelemetryPoint]) -> int:
    """Return index of minimum speed point (apex proxy)."""
    if not points:
        return 0
    return min(range(len(points)), key=lambda i: points[i].get("speed_kmh", float("inf")))


def get_entry_speed(points: list[TelemetryPoint]) -> float | None:
    if not points:
        return None
    return points[0].get("speed_kmh")


def get_exit_speed(points: list[TelemetryPoint]) -> float | None:
    if not points:
        return None
    return points[-1].get("speed_kmh")


def get_min_speed(points: list[TelemetryPoint]) -> float | None:
    if not points:
        return None
    speeds = [pt.get("speed_kmh") for pt in points if pt.get("speed_kmh") is not None]
    return min(speeds) if speeds else None


def compute_corner_time_s(points: list[TelemetryPoint]) -> float | None:
    """Elapsed time across the corner slice in seconds."""
    if len(points) < 2:
        return None
    return (points[-1]["timestamp"] - points[0]["timestamp"]) / 1000.0


def has_field(points: list[TelemetryPoint], field: str) -> bool:
    """True if at least half the points have a non-None value for field."""
    if not points:
        return False
    count = sum(1 for pt in points if pt.get(field) is not None)
    return count >= len(points) / 2


def extract_field_values(
    points: list[TelemetryPoint], field: str
) -> list[float]:
    """Extract non-None numeric values for field."""
    return [pt[field] for pt in points if pt.get(field) is not None]


def compute_std(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    variance = sum((v - mean) ** 2 for v in values) / len(values)
    return math.sqrt(variance)


def compute_mean(values: list[float]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)


def clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))
