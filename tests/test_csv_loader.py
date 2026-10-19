"""
Unit tests for CSV Data Loader and Quality Validation.
"""

import pytest
import pandas as pd
from pathlib import Path

from src.ingestion.csv_loader import CSVLoader, CSVValidationError, EXPECTED_COLUMNS
from config.settings import settings


def test_valid_csv_loads_correctly():
    """Confirms the primary provided CSV passes all required checks."""
    loader = CSVLoader(settings.csv_data_path)
    df, report = loader.validate_and_load()
    assert report["is_valid"] is True
    assert len(df) == 720
    assert "parsed_timestamp" in df.columns
    # Check chronological ordering
    assert df["parsed_timestamp"].is_monotonic_increasing


def test_missing_columns_raises_clear_error(tmp_path):
    """Checks that missing critical columns raise a descriptive CSVValidationError."""
    bad_csv = tmp_path / "bad_data.csv"
    bad_df = pd.DataFrame({
        "timestamp": ["2026-09-18 00:00:00"],
        "pm25_ug_m3": [12.0]
    })
    bad_df.to_csv(bad_csv, index=False)

    loader = CSVLoader(bad_csv)
    with pytest.raises(CSVValidationError) as exc_info:
        loader.validate_and_load()
    assert "Missing required columns" in str(exc_info.value)


def test_duplicate_timestamp_flagging(tmp_path):
    """Ensures duplicate timestamps are flagged without silently dropping rows."""
    dup_csv = tmp_path / "dup_data.csv"
    # Create valid dummy schema with duplicate timestamp
    row = {col: 0.0 for col in EXPECTED_COLUMNS}
    row["timestamp"] = "2026-09-18 00:00:00"
    row["synthetic_flareup_risk"] = "low"
    row["peak_flow_pef_l_min"] = 400
    row["spo2_pct"] = 98.0
    row["respiratory_rate_bpm"] = 16
    row["heart_rate_bpm"] = 70

    dup_df = pd.DataFrame([row, row])
    dup_df.to_csv(dup_csv, index=False)

    loader = CSVLoader(dup_csv)
    df, report = loader.validate_and_load()
    assert report["duplicate_timestamps"] == 1
    assert "is_duplicate_timestamp" in df.columns
    assert df["is_duplicate_timestamp"].any()
