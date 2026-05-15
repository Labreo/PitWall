"""
coaching_context_builder.py — Orchestrator: session JSON → per-corner coaching context.

Entry point: build_coaching_context(session: dict) -> list[dict]
Output: one dict per (corner, lap) combination, matching the output contract.

Segment timestamps model: each segment entry has absolute timestamps covering a
single lap's pass through that corner. Multiple laps → multiple segment entries
sharing the same segment_id. The orchestrator groups by segment_id and collects
slices from all matching segment instances.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Any

from corner_analysis import (
    Lap,
    Segment,
    TelemetryPoint,
    classify_corner_type,
    compute_corner_time_s,
    get_entry_speed,
    get_exit_speed,
    get_min_speed,
    slice_telemetry_for_corner,
)
from coaching_metrics import (
    compute_confidence,
    compute_time_loss,
    determine_coaching_priority,
    score_apex_consistency,
    score_braking_aggressiveness,
    score_steering_stability,
    score_throttle_application_quality,
)


def _lap_for_segment(seg: Segment, laps: list[Lap]) -> Lap | None:
    """Find the lap whose time window contains this segment."""
    for lap in laps:
        if lap["start_timestamp"] <= seg["start_timestamp"] <= lap["end_timestamp"]:
            return lap
    return None


def build_coaching_context(session: dict[str, Any]) -> list[dict[str, Any]]:
    """Transform a session dict into a flat list of per-corner per-lap context dicts.

    Low-confidence corners (< 0.40) are included but flagged — callers should
    suppress coaching text for these and surface them only as data artifacts.
    """
    telemetry: list[TelemetryPoint] = session.get("telemetry", [])
    all_segments: list[Segment] = session.get("segments", [])
    laps: list[Lap] = session.get("laps", [])

    corner_segments = [s for s in all_segments if s.get("segment_type") == "corner"]

    if not telemetry or not corner_segments or not laps:
        return []

    # Group segment instances by segment_id — multiple instances = multiple laps
    seg_groups: dict[str, list[Segment]] = defaultdict(list)
    for seg in corner_segments:
        seg_groups[seg["segment_id"]].append(seg)

    results: list[dict[str, Any]] = []

    for corner_id, seg_instances in seg_groups.items():
        # Use first instance for classification (same corner regardless of lap)
        corner_type = classify_corner_type(seg_instances[0])

        # --- Gather per-lap raw extractions ---
        lap_data: list[dict[str, Any]] = []

        for seg in seg_instances:
            # Find which lap this segment instance belongs to
            lap = _lap_for_segment(seg, laps)
            if lap is None:
                continue

            points = slice_telemetry_for_corner(telemetry, seg, lap)
            if len(points) < 3:
                continue

            entry = get_entry_speed(points)
            apex = get_min_speed(points)
            exit_ = get_exit_speed(points)
            corner_time = compute_corner_time_s(points)

            brake_score, brake_path = score_braking_aggressiveness(points, entry, apex)
            throttle_score, throttle_path = score_throttle_application_quality(points, apex, exit_)
            steer_score, steer_path = score_steering_stability(points)

            lap_data.append({
                "lap_number":                   lap["lap_number"],
                "points":                       points,
                "entry_speed_kmh":              entry,
                "min_speed_kmh":                apex,
                "exit_speed_kmh":               exit_,
                "corner_time_s":                corner_time,
                "braking_aggressiveness":       brake_score,
                "braking_path":                 brake_path,
                "throttle_application_quality": throttle_score,
                "throttle_path":                throttle_path,
                "steering_stability":           steer_score,
                "steering_path":                steer_path,
            })

        if not lap_data:
            continue

        # --- Cross-lap metrics ---
        apex_speeds = [d["min_speed_kmh"] for d in lap_data if d["min_speed_kmh"] is not None]
        apex_consistency = score_apex_consistency(apex_speeds)

        valid_times = [d["corner_time_s"] for d in lap_data if d["corner_time_s"] is not None]
        # Cross-lap time comparison requires at least 2 laps with valid corner times
        best_corner_time = min(valid_times) if len(valid_times) >= 2 else None

        n_laps = len(lap_data)

        # --- Assemble one context dict per lap ---
        for d in lap_data:
            confidence = compute_confidence(
                points=d["points"],
                braking_path=d["braking_path"],
                throttle_path=d["throttle_path"],
                steering_path=d["steering_path"],
                n_laps=n_laps,
                entry_speed=d["entry_speed_kmh"],
                min_speed=d["min_speed_kmh"],
                exit_speed=d["exit_speed_kmh"],
            )

            time_loss = compute_time_loss(d["corner_time_s"], best_corner_time)

            priority = determine_coaching_priority(
                braking_aggressiveness=d["braking_aggressiveness"],
                throttle_application_quality=d["throttle_application_quality"],
                steering_stability=d["steering_stability"],
                apex_consistency_score=apex_consistency,
                time_loss_vs_best_lap=time_loss,
            )

            results.append({
                "corner_id":                    corner_id,
                "lap_number":                   d["lap_number"],
                "corner_type":                  corner_type,
                "entry_speed_kmh":              _round(d["entry_speed_kmh"]),
                "min_speed_kmh":                _round(d["min_speed_kmh"]),
                "exit_speed_kmh":               _round(d["exit_speed_kmh"]),
                "braking_aggressiveness":       round(d["braking_aggressiveness"], 4),
                "throttle_application_quality": round(d["throttle_application_quality"], 4),
                "steering_stability":           round(d["steering_stability"], 4),
                "apex_consistency_score":       _round(apex_consistency, 4),
                "time_loss_vs_best_lap":        time_loss,
                "confidence_score":             confidence,
                "coaching_priority":            priority,
            })

    return results


def _round(value: float | None, ndigits: int = 2) -> float | None:
    if value is None:
        return None
    return round(value, ndigits)
