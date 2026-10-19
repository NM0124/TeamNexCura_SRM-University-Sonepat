"""
Unit tests for Feature Engineering Pipeline.
Verifies no future leakage and excludes target labels from features.
"""

from datetime import datetime, timedelta
from src.digital_twin.feature_engineering import FeatureEngineer, FEATURE_NAMES


def test_feature_engineering_strictly_uses_past():
    """Confirms observation at t=10h only uses observations at t<=10h."""
    t0 = datetime(2026, 10, 1, 0, 0, 0)
    history = []
    for h in range(10):
        t = t0 + timedelta(hours=h)
        history.append({
            "timestamp": t.isoformat(),
            "peak_flow_pef_l_min": 400 + h * 2,
            "spo2_pct": 98.0,
            "respiratory_rate_bpm": 16,
            "heart_rate_bpm": 72,
            "pm25_ug_m3": 20.0,
            "pm10_ug_m3": 40.0,
            "pollen_level": 3.0,
            "symptom_severity": 0,
            "rescue_inhaler_uses": 0,
            "exercise_flag": 0
        })

    current_obs = {
        "timestamp": (t0 + timedelta(hours=10)).isoformat(),
        "peak_flow_pef_l_min": 350,  # Sudden drop at t=10
        "spo2_pct": 95.0,
        "respiratory_rate_bpm": 20,
        "heart_rate_bpm": 85,
        "pm25_ug_m3": 45.0,
        "pm10_ug_m3": 80.0,
        "pollen_level": 7.0,
        "symptom_severity": 2,
        "rescue_inhaler_uses": 1,
        "exercise_flag": 0
    }

    feats = FeatureEngineer.extract_features(
        current_obs=current_obs,
        past_observations=history,
        pef_reference=420.0
    )

    # Verify extracted features
    assert feats["pef_current"] == 350.0
    assert feats["pef_pct_of_reference"] == 350.0 / 420.0
    assert feats["pm25_current"] == 45.0
    assert feats["symptom_severity_current"] == 2.0
    assert feats["rescue_inhaler_6h_sum"] == 1.0

    # Ensure target labels are NOT in feature dict
    assert "synthetic_flareup_risk" not in feats
    assert "future_pef_deterioration_label" not in feats


def test_feature_vector_matches_expected_dimensions():
    sample_obs = {
        "timestamp": datetime.utcnow().isoformat(),
        "peak_flow_pef_l_min": 410,
        "spo2_pct": 98.0,
        "respiratory_rate_bpm": 15,
        "heart_rate_bpm": 70,
        "pm25_ug_m3": 15.0,
        "pm10_ug_m3": 30.0,
        "pollen_level": 2.0,
        "symptom_severity": 0,
        "rescue_inhaler_uses": 0,
        "exercise_flag": 0
    }
    feats = FeatureEngineer.extract_features(sample_obs, [])
    vec = FeatureEngineer.to_feature_vector(feats)
    assert len(vec) == len(FEATURE_NAMES)
