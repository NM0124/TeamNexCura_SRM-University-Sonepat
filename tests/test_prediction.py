"""
Unit tests for Prediction, Label Construction, and Safe Abstention.
"""

from datetime import datetime
import pandas as pd
import numpy as np

from src.prediction.label_builder import LabelBuilder
from src.prediction.predictor import RiskPredictor
from src.digital_twin.patient_twin import PatientTwin


def test_label_builder_forward_window():
    """Verifies label at row i depends strictly on subsequent observations (i < j <= i + H)."""
    # 10 hourly points
    timestamps = [f"2026-10-01 0{i}:00:00" for i in range(10)]
    pef = [400, 400, 400, 300, 290, 400, 400, 400, 400, 400]  # Drops at t=3 and t=4
    df = pd.DataFrame({
        "timestamp": timestamps,
        "peak_flow_pef_l_min": pef,
        "pef_reference": [400] * 10
    })

    # Horizon = 3 hours, threshold = 80% (320 L/min), consecutive = 2
    lb = LabelBuilder(horizon_hours=3, pef_threshold_pct=0.80, consecutive_readings=2)
    df_labeled = lb.build_labels(df, pef_reference_col="pef_reference")

    # At row 0 (t=0): future window [1, 2, 3] contains PEF 400, 400, 300 (only 1 drop) -> label 0
    assert df_labeled.loc[0, "future_pef_deterioration_label"] == 0
    # At row 1 (t=1): future window [2, 3, 4] contains PEF 400, 300, 290 (2 consecutive drops) -> label 1
    assert df_labeled.loc[1, "future_pef_deterioration_label"] == 1


def test_safe_abstention_on_corrupt_data():
    """Ensures predictor abstains with clear reason when essential data are missing or corrupt."""
    twin = PatientTwin("TEST_ABSTAIN")
    # Ingest invalid observation with SpO2 = 30% (implausible) and missing PEF
    corrupt_obs = {
        "timestamp": datetime.utcnow().isoformat(),
        "peak_flow_pef_l_min": -50,
        "spo2_pct": 30.0,
        "respiratory_rate_bpm": 15
    }
    twin.ingest_observation(corrupt_obs)

    pred = RiskPredictor.evaluate_risk(twin)
    assert pred["withheld"] is True
    assert pred["risk_category"] == "withheld"
    assert "Unreliable or missing" in pred["withhold_reason"] or "implausible" in pred["withhold_reason"].lower() or "outside plausible" in pred["withhold_reason"].lower()
