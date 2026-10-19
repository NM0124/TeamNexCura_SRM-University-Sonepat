"""
Unit tests for the Time-Series Stream Replay Engine.
"""

import pandas as pd
from src.ingestion.csv_stream_replay import CSVStreamReplay
from src.ingestion.csv_loader import CSVLoader
from config.settings import settings


def test_replay_stepping_and_reset():
    loader = CSVLoader(settings.csv_data_path)
    df, _ = loader.validate_and_load()

    replay = CSVStreamReplay(df, patient_id="CSV_PATIENT_001")
    assert replay.processed_count == 0
    assert replay.remaining_count == 720
    assert replay.has_more is True

    # Step forward 5 observations
    for i in range(5):
        obs = replay.step()
        assert obs is not None
        assert obs["patient_id"] == "CSV_PATIENT_001"
        assert obs["row_index"] == i
        assert "simulated_arrival_time" in obs

    assert replay.processed_count == 5
    assert replay.remaining_count == 715

    # Test reset
    replay.reset()
    assert replay.processed_count == 0
    assert replay.remaining_count == 720


def test_replay_reaches_end():
    # Mini dataset
    df = pd.DataFrame({
        "timestamp": ["2026-09-18 00:00:00", "2026-09-18 01:00:00"],
        "peak_flow_pef_l_min": [410, 420]
    })
    replay = CSVStreamReplay(df, patient_id="TEST_PAT")
    assert replay.step() is not None
    assert replay.step() is not None
    # End reached
    assert replay.step() is None
    assert replay.has_more is False
