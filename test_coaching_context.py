"""
test_coaching_context.py — Deterministic assertions for coaching context pipeline.

No mocks. All fixtures are hand-crafted telemetry with known expected outputs.
Run: python -m pytest test_coaching_context.py -v
"""

from __future__ import annotations

import pytest

from corner_analysis import (
    classify_corner_type,
    clamp,
    compute_corner_time_s,
    compute_mean,
    compute_std,
    extract_entry_phase,
    extract_exit_phase,
    find_apex_index,
    get_entry_speed,
    get_exit_speed,
    get_min_speed,
    has_field,
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
from coaching_context_builder import build_coaching_context


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_point(
    ts: int,
    speed: float = 100.0,
    throttle: float | None = None,
    brake: float | None = None,
    steering: float | None = None,
    long_g: float | None = None,
    lat_g: float | None = None,
) -> dict:
    pt: dict = {"timestamp": ts, "speed_kmh": speed}
    if throttle is not None:
        pt["throttle_pct"] = throttle
    if brake is not None:
        pt["brake_pct"] = brake
    if steering is not None:
        pt["steering_angle_deg"] = steering
    if long_g is not None:
        pt["longitudinal_g"] = long_g
    if lat_g is not None:
        pt["lateral_g"] = lat_g
    return pt


def make_segment(
    seg_id: str = "S1",
    seg_type: str = "corner",
    start_ts: int = 1000,
    end_ts: int = 5000,
    heading: float | None = -95.0,
    avg_speed: float = 90.0,
) -> dict:
    return {
        "segment_id": seg_id,
        "segment_type": seg_type,
        "start_timestamp": start_ts,
        "end_timestamp": end_ts,
        "heading_change_degrees": heading,
        "average_speed": avg_speed,
    }


def make_lap(lap_num: int = 1, start_ts: int = 0, end_ts: int = 90000) -> dict:
    return {"lap_number": lap_num, "start_timestamp": start_ts, "end_timestamp": end_ts}


# ---------------------------------------------------------------------------
# corner_analysis — classify_corner_type
# ---------------------------------------------------------------------------

class TestClassifyCornerType:
    def test_heavy_braking_by_heading(self):
        seg = make_segment(heading=-95.0)
        assert classify_corner_type(seg) == "heavy_braking"

    def test_medium_by_heading(self):
        seg = make_segment(heading=-72.0)
        assert classify_corner_type(seg) == "medium"

    def test_light_by_heading(self):
        seg = make_segment(heading=-45.0)
        assert classify_corner_type(seg) == "light"

    def test_boundary_90_is_heavy(self):
        seg = make_segment(heading=-90.0)
        assert classify_corner_type(seg) == "heavy_braking"

    def test_boundary_60_is_medium(self):
        seg = make_segment(heading=-60.0)
        assert classify_corner_type(seg) == "medium"

    def test_fallback_to_speed_when_no_heading(self):
        seg = make_segment(heading=None, avg_speed=80.0)
        assert classify_corner_type(seg) == "heavy_braking"

    def test_fallback_medium_speed(self):
        seg = make_segment(heading=None, avg_speed=125.0)
        assert classify_corner_type(seg) == "medium"

    def test_fallback_light_speed(self):
        seg = make_segment(heading=None, avg_speed=160.0)
        assert classify_corner_type(seg) == "light"

    def test_heading_takes_priority_over_speed(self):
        # heading says heavy; speed says light — heading wins
        seg = make_segment(heading=-95.0, avg_speed=160.0)
        assert classify_corner_type(seg) == "heavy_braking"


# ---------------------------------------------------------------------------
# corner_analysis — slice_telemetry_for_corner
# ---------------------------------------------------------------------------

class TestSliceTelemetry:
    def setup_method(self):
        self.telemetry = [make_point(ts) for ts in range(0, 10000, 500)]
        self.seg = make_segment(start_ts=1000, end_ts=3000)
        self.lap = make_lap(start_ts=0, end_ts=9500)

    def test_returns_only_points_in_segment_window(self):
        result = slice_telemetry_for_corner(self.telemetry, self.seg, self.lap)
        timestamps = [pt["timestamp"] for pt in result]
        assert all(1000 <= ts <= 3000 for ts in timestamps)

    def test_empty_when_segment_outside_lap(self):
        lap = make_lap(start_ts=5000, end_ts=9500)
        result = slice_telemetry_for_corner(self.telemetry, self.seg, lap)
        assert result == []

    def test_lap_bounds_clip_segment(self):
        lap = make_lap(start_ts=2000, end_ts=9500)
        result = slice_telemetry_for_corner(self.telemetry, self.seg, lap)
        assert all(2000 <= pt["timestamp"] <= 3000 for pt in result)

    def test_empty_telemetry_returns_empty(self):
        result = slice_telemetry_for_corner([], self.seg, self.lap)
        assert result == []

    def test_boundary_points_included(self):
        result = slice_telemetry_for_corner(self.telemetry, self.seg, self.lap)
        ts_set = {pt["timestamp"] for pt in result}
        assert 1000 in ts_set
        assert 3000 in ts_set


# ---------------------------------------------------------------------------
# corner_analysis — phase extraction
# ---------------------------------------------------------------------------

class TestPhaseExtraction:
    def setup_method(self):
        self.pts = [make_point(i * 100) for i in range(12)]

    def test_entry_phase_length(self):
        assert len(extract_entry_phase(self.pts)) == 4  # floor(12/3)

    def test_exit_phase_is_final_third(self):
        exit_ = extract_exit_phase(self.pts)
        assert exit_[-1] is self.pts[-1]

    def test_empty_returns_empty(self):
        assert extract_entry_phase([]) == []
        assert extract_exit_phase([]) == []

    def test_single_point_entry(self):
        result = extract_entry_phase([make_point(0)])
        assert len(result) == 1

    def test_find_apex_index(self):
        pts = [make_point(i * 100, speed=200 - i * 10) for i in range(10)]
        # Speeds: 200, 190, ..., 110 — minimum at index 9
        assert find_apex_index(pts) == 9

    def test_find_apex_mid_corner(self):
        speeds = [180, 150, 110, 90, 100, 130]
        pts = [make_point(i * 100, speed=s) for i, s in enumerate(speeds)]
        assert find_apex_index(pts) == 3  # speed=90


# ---------------------------------------------------------------------------
# coaching_metrics — braking_aggressiveness
# ---------------------------------------------------------------------------

class TestBrakingAggressiveness:
    def test_brake_sensor_path(self):
        pts = [make_point(i * 100, speed=200 - i * 15, brake=0.85) for i in range(9)]
        score, path = score_braking_aggressiveness(pts, 200, 80)
        assert path == "sensor"
        assert abs(score - 0.85) < 0.01

    def test_brake_sensor_clamped_to_1(self):
        pts = [make_point(i * 100, brake=1.2) for i in range(9)]
        score, _ = score_braking_aggressiveness(pts, 200, 80)
        assert score <= 1.0

    def test_longit_g_path(self):
        # -3.5g = maximum = score 1.0
        pts = [make_point(i * 100, long_g=-3.5) for i in range(9)]
        score, path = score_braking_aggressiveness(pts, 200, 80)
        assert path == "longit_g"
        assert abs(score - 1.0) < 0.01

    def test_longit_g_moderate(self):
        pts = [make_point(i * 100, long_g=-1.75) for i in range(9)]
        score, path = score_braking_aggressiveness(pts, 200, 80)
        assert path == "longit_g"
        assert abs(score - 0.5) < 0.01

    def test_speed_delta_fallback(self):
        pts = [make_point(i * 100) for i in range(9)]  # no brake, no longit_g
        score, path = score_braking_aggressiveness(pts, 180, 60)
        assert path == "speed_delta"
        assert abs(score - 1.0) < 0.01  # 120 km/h drop = clamp to 1.0

    def test_speed_delta_half(self):
        pts = [make_point(i * 100) for i in range(9)]
        score, path = score_braking_aggressiveness(pts, 160, 100)
        assert path == "speed_delta"
        assert abs(score - 0.5) < 0.01  # 60 km/h drop / 120 = 0.5

    def test_absent_returns_neutral(self):
        pts = [make_point(i * 100) for i in range(9)]
        score, path = score_braking_aggressiveness(pts, None, None)
        assert path == "absent"
        assert score == 0.5


# ---------------------------------------------------------------------------
# coaching_metrics — throttle_application_quality
# ---------------------------------------------------------------------------

class TestThrottleApplicationQuality:
    def test_smooth_linear_pickup(self):
        # 9 points: throttle ramps from 0.0 to 0.9 linearly
        pts = [make_point(i * 100, speed=100 + i * 5, throttle=i * 0.1) for i in range(9)]
        score, path = score_throttle_application_quality(pts, 100, 145)
        assert path == "sensor"
        assert score > 0.5  # smooth linear pickup should score well

    def test_oscillating_throttle_scores_low(self):
        # Throttle oscillates wildly
        vals = [0.1, 0.8, 0.1, 0.9, 0.0, 0.7, 0.2, 0.8, 0.1]
        pts = [make_point(i * 100, speed=100 + i, throttle=v) for i, v in enumerate(vals)]
        score, _ = score_throttle_application_quality(pts, 100, 109)
        assert score < 0.5

    def test_speed_inferred_path(self):
        # No throttle sensor — speeds accelerate in exit zone
        pts = [make_point(i * 100, speed=80 + i * 8) for i in range(9)]
        score, path = score_throttle_application_quality(pts, 80, 144)
        assert path == "inferred"
        assert score > 0.4

    def test_absent_returns_neutral(self):
        pts = []
        score, path = score_throttle_application_quality(pts, None, None)
        assert path == "absent"
        assert score == 0.5


# ---------------------------------------------------------------------------
# coaching_metrics — steering_stability
# ---------------------------------------------------------------------------

class TestSteeringStability:
    def test_smooth_arc_scores_high(self):
        # Monotonically increasing angle = clean turn-in, no corrections
        pts = [make_point(i * 100, steering=i * 3.0) for i in range(12)]
        score, path = score_steering_stability(pts)
        assert path == "sensor"
        assert score > 0.6

    def test_sawing_scores_low(self):
        # Alternating corrections
        angles = [0, 10, -5, 15, -8, 20, -10, 18, -6, 12]
        pts = [make_point(i * 100, steering=a) for i, a in enumerate(angles)]
        score, _ = score_steering_stability(pts)
        assert score < 0.5

    def test_lateral_g_path(self):
        pts = [make_point(i * 100, lat_g=1.2 + i * 0.01) for i in range(12)]
        score, path = score_steering_stability(pts)
        assert path == "lateral_g"

    def test_absent_returns_neutral(self):
        pts = [make_point(i * 100) for i in range(12)]
        score, path = score_steering_stability(pts)
        assert path == "absent"
        assert score == 0.5


# ---------------------------------------------------------------------------
# coaching_metrics — apex_consistency
# ---------------------------------------------------------------------------

class TestApexConsistency:
    def test_consistent_apex_speeds(self):
        # Very tight cluster → score near 1.0
        score = score_apex_consistency([100.0, 101.0, 99.5, 100.5])
        assert score is not None
        assert score > 0.85

    def test_inconsistent_apex_speeds(self):
        score = score_apex_consistency([100.0, 130.0, 85.0, 115.0])
        assert score is not None
        assert score < 0.5

    def test_single_lap_returns_none(self):
        assert score_apex_consistency([100.0]) is None

    def test_empty_returns_none(self):
        assert score_apex_consistency([]) is None

    def test_two_laps_minimum(self):
        score = score_apex_consistency([100.0, 102.0])
        assert score is not None

    def test_perfect_consistency(self):
        score = score_apex_consistency([100.0, 100.0, 100.0])
        assert score == 1.0  # CV=0 → score = clamp(1 - 0/0.15, 0, 1) = 1.0


# ---------------------------------------------------------------------------
# coaching_metrics — time_loss
# ---------------------------------------------------------------------------

class TestTimeLoss:
    def test_slower_than_best(self):
        loss = compute_time_loss(12.5, 12.0)
        assert abs(loss - 0.5) < 0.001

    def test_is_the_best_lap(self):
        loss = compute_time_loss(12.0, 12.0)
        assert loss == 0.0

    def test_none_inputs_return_none(self):
        assert compute_time_loss(None, 12.0) is None
        assert compute_time_loss(12.0, None) is None
        assert compute_time_loss(None, None) is None


# ---------------------------------------------------------------------------
# coaching_metrics — confidence
# ---------------------------------------------------------------------------

class TestConfidence:
    def _base_points(self, n=12):
        return [
            make_point(i * 100, speed=200 - i * 5, brake=0.8, throttle=0.0, steering=i * 2.0)
            for i in range(n)
        ]

    def test_full_sensors_high_confidence(self):
        pts = self._base_points(12)
        conf = compute_confidence(pts, "sensor", "sensor", "sensor", 4, 200, 80, 130)
        assert conf > 0.80

    def test_all_fallbacks_lower_confidence(self):
        pts = self._base_points(12)
        conf = compute_confidence(pts, "speed_delta", "inferred", "lateral_g", 2, 200, 80, 130)
        assert conf < 0.80

    def test_low_sample_count_penalizes(self):
        pts = self._base_points(3)
        conf_full = compute_confidence(pts, "sensor", "sensor", "sensor", 4, 200, 80, 130)
        pts_more = self._base_points(12)
        conf_more = compute_confidence(pts_more, "sensor", "sensor", "sensor", 4, 200, 80, 130)
        assert conf_full < conf_more

    def test_broken_speed_profile_penalizes(self):
        pts = self._base_points(12)
        # entry < min (impossible physically)
        conf_broken = compute_confidence(pts, "sensor", "sensor", "sensor", 4, 60, 80, 130)
        conf_good = compute_confidence(pts, "sensor", "sensor", "sensor", 4, 200, 80, 130)
        assert conf_broken < conf_good

    def test_single_lap_reduces_confidence(self):
        pts = self._base_points(12)
        conf_1 = compute_confidence(pts, "sensor", "sensor", "sensor", 1, 200, 80, 130)
        conf_4 = compute_confidence(pts, "sensor", "sensor", "sensor", 4, 200, 80, 130)
        assert conf_1 < conf_4


# ---------------------------------------------------------------------------
# coaching_metrics — coaching_priority
# ---------------------------------------------------------------------------

class TestCoachingPriority:
    def test_critical_overcook_and_lazy_exit(self):
        priority = determine_coaching_priority(
            braking_aggressiveness=0.90,
            throttle_application_quality=0.30,
            steering_stability=0.80,
            apex_consistency_score=0.80,
            time_loss_vs_best_lap=0.10,
        )
        assert priority == "critical"

    def test_critical_time_loss(self):
        priority = determine_coaching_priority(
            braking_aggressiveness=0.60,
            throttle_application_quality=0.70,
            steering_stability=0.75,
            apex_consistency_score=0.80,
            time_loss_vs_best_lap=0.60,
        )
        assert priority == "critical"

    def test_warn_high_braking(self):
        priority = determine_coaching_priority(
            braking_aggressiveness=0.75,
            throttle_application_quality=0.65,
            steering_stability=0.70,
            apex_consistency_score=0.70,
            time_loss_vs_best_lap=0.10,
        )
        assert priority == "warn"

    def test_warn_poor_throttle(self):
        priority = determine_coaching_priority(
            braking_aggressiveness=0.50,
            throttle_application_quality=0.40,
            steering_stability=0.70,
            apex_consistency_score=0.70,
            time_loss_vs_best_lap=0.10,
        )
        assert priority == "warn"

    def test_warn_steering(self):
        priority = determine_coaching_priority(
            braking_aggressiveness=0.50,
            throttle_application_quality=0.65,
            steering_stability=0.40,
            apex_consistency_score=0.70,
            time_loss_vs_best_lap=0.05,
        )
        assert priority == "warn"

    def test_info_all_clean(self):
        priority = determine_coaching_priority(
            braking_aggressiveness=0.50,
            throttle_application_quality=0.70,
            steering_stability=0.80,
            apex_consistency_score=0.80,
            time_loss_vs_best_lap=0.05,
        )
        assert priority == "info"

    def test_none_cross_lap_metrics_do_not_crash(self):
        priority = determine_coaching_priority(
            braking_aggressiveness=0.50,
            throttle_application_quality=0.70,
            steering_stability=0.80,
            apex_consistency_score=None,
            time_loss_vs_best_lap=None,
        )
        assert priority == "info"


# ---------------------------------------------------------------------------
# coaching_context_builder — integration
# ---------------------------------------------------------------------------

def _build_session(n_laps: int = 2) -> dict:
    """Build a minimal but realistic session fixture with known characteristics.

    Segment timestamps are absolute (matching real pipeline output).
    Each lap contributes one segment instance with timestamps within that lap's window.
    """
    lap_duration_ms = 60_000
    seg_rel_start = 5_000   # corner starts 5s into each lap
    seg_rel_end = 10_000    # corner ends 10s into each lap (5s duration)

    laps = []
    telemetry = []
    segments = []

    for lap_num in range(1, n_laps + 1):
        lap_offset = (lap_num - 1) * lap_duration_ms
        lap_start = lap_offset
        lap_end = lap_offset + lap_duration_ms

        laps.append(make_lap(lap_num=lap_num, start_ts=lap_start, end_ts=lap_end))

        seg_abs_start = lap_offset + seg_rel_start
        seg_abs_end = lap_offset + seg_rel_end

        # One segment per lap, with absolute timestamps
        segments.append({
            "segment_id": "C1",
            "segment_type": "corner",
            "start_timestamp": seg_abs_start,
            "end_timestamp": seg_abs_end,
            "heading_change_degrees": -92.0,
            "average_speed": 140.0,
        })

        # 20 telemetry points per corner (every 250ms over 5s)
        for i in range(20):
            ts = seg_abs_start + i * 250
            speed = 180 - i * 4
            throttle = max(0.0, (i - 15) * 0.2)
            brake = max(0.0, (10 - i) * 0.09)
            steering = i * 2.5
            telemetry.append(make_point(
                ts=ts,
                speed=speed,
                throttle=throttle,
                brake=brake,
                steering=steering,
            ))

    return {"session_id": "test", "track": "test_circuit", "laps": laps, "segments": segments, "telemetry": telemetry}


class TestBuildCoachingContext:
    def test_returns_one_result_per_lap(self):
        session = _build_session(n_laps=3)
        results = build_coaching_context(session)
        assert len(results) == 3

    def test_corner_id_preserved(self):
        session = _build_session()
        results = build_coaching_context(session)
        assert all(r["corner_id"] == "C1" for r in results)

    def test_corner_type_classified(self):
        session = _build_session()
        results = build_coaching_context(session)
        assert all(r["corner_type"] == "heavy_braking" for r in results)

    def test_speed_fields_present(self):
        session = _build_session()
        results = build_coaching_context(session)
        for r in results:
            assert r["entry_speed_kmh"] is not None
            assert r["min_speed_kmh"] is not None
            assert r["exit_speed_kmh"] is not None

    def test_entry_speed_greater_than_min(self):
        session = _build_session()
        results = build_coaching_context(session)
        for r in results:
            assert r["entry_speed_kmh"] > r["min_speed_kmh"]

    def test_confidence_between_0_and_1(self):
        session = _build_session()
        results = build_coaching_context(session)
        for r in results:
            assert 0.0 <= r["confidence_score"] <= 1.0

    def test_priority_is_valid_value(self):
        session = _build_session()
        results = build_coaching_context(session)
        valid = {"critical", "warn", "info"}
        for r in results:
            assert r["coaching_priority"] in valid

    def test_apex_consistency_null_for_single_lap(self):
        session = _build_session(n_laps=1)
        results = build_coaching_context(session)
        assert results[0]["apex_consistency_score"] is None

    def test_apex_consistency_present_for_multi_lap(self):
        session = _build_session(n_laps=3)
        results = build_coaching_context(session)
        assert all(r["apex_consistency_score"] is not None for r in results)

    def test_time_loss_null_for_single_lap(self):
        session = _build_session(n_laps=1)
        results = build_coaching_context(session)
        assert results[0]["time_loss_vs_best_lap"] is None

    def test_best_lap_has_zero_time_loss(self):
        session = _build_session(n_laps=3)
        results = build_coaching_context(session)
        losses = [r["time_loss_vs_best_lap"] for r in results if r["time_loss_vs_best_lap"] is not None]
        assert min(losses) == 0.0

    def test_non_corner_segments_excluded(self):
        session = _build_session()
        session["segments"].append({
            "segment_id": "STR1",
            "segment_type": "straight",
            "start_timestamp": 15_000,
            "end_timestamp": 25_000,
            "heading_change_degrees": -5.0,
            "average_speed": 200.0,
        })
        results = build_coaching_context(session)
        assert all(r["corner_id"] == "C1" for r in results)

    def test_empty_telemetry_returns_empty(self):
        session = _build_session()
        session["telemetry"] = []
        results = build_coaching_context(session)
        assert results == []

    def test_empty_laps_returns_empty(self):
        session = _build_session()
        session["laps"] = []
        results = build_coaching_context(session)
        assert results == []

    def test_lap_numbers_correct(self):
        session = _build_session(n_laps=3)
        results = build_coaching_context(session)
        lap_nums = sorted(r["lap_number"] for r in results)
        assert lap_nums == [1, 2, 3]

    def test_all_metric_scores_in_range(self):
        session = _build_session(n_laps=2)
        results = build_coaching_context(session)
        for r in results:
            for field in ["braking_aggressiveness", "throttle_application_quality", "steering_stability"]:
                assert 0.0 <= r[field] <= 1.0, f"{field} out of range: {r[field]}"
