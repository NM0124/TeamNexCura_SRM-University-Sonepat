"""
CSV Time-Series Stream Replay Engine.
Simulates incremental continuous arrival of wearable and environmental observations
for a patient's digital twin without leaking future observations.
"""

from typing import Optional, Dict, Any, Tuple
from datetime import datetime
import pandas as pd
import uuid


class CSVStreamReplay:
    def __init__(self, df: pd.DataFrame, patient_id: str = "CSV_PATIENT_001", session_id: Optional[str] = None):
        if "parsed_timestamp" not in df.columns:
            df["parsed_timestamp"] = pd.to_datetime(df["timestamp"])
        self.df = df.sort_values(by="parsed_timestamp").reset_index(drop=True)
        self.patient_id = patient_id
        self.session_id = session_id or str(uuid.uuid4())[:8]
        self.current_index = 0
        self.is_paused = True
        self.playback_speed_multiplier = 1.0  # 1.0x, 2.0x, etc.

    @property
    def total_rows(self) -> int:
        return len(self.df)

    @property
    def processed_count(self) -> int:
        return self.current_index

    @property
    def remaining_count(self) -> int:
        return max(0, self.total_rows - self.current_index)

    @property
    def has_more(self) -> bool:
        return self.current_index < self.total_rows

    @property
    def current_timestamp(self) -> Optional[datetime]:
        if 0 < self.current_index <= self.total_rows:
            return self.df.iloc[self.current_index - 1]["parsed_timestamp"]
        elif self.total_rows > 0:
            return self.df.iloc[0]["parsed_timestamp"]
        return None

    def start(self):
        self.is_paused = False

    def pause(self):
        self.is_paused = True

    def resume(self):
        self.is_paused = False

    def reset(self):
        self.current_index = 0
        self.is_paused = True

    def seek(self, index: int):
        self.current_index = max(0, min(index, self.total_rows))

    def step(self) -> Optional[Dict[str, Any]]:
        """Advances one observation forward and returns the record with provenance metadata."""
        if not self.has_more:
            self.is_paused = True
            return None

        row = self.df.iloc[self.current_index].to_dict()
        self.current_index += 1

        def _safe_int(val, default=0):
            if val is None or pd.isna(val):
                return default
            try:
                return int(round(float(val)))
            except (ValueError, TypeError):
                return default

        def _safe_float(val, default=0.0):
            if val is None or pd.isna(val):
                return default
            try:
                return float(val)
            except (ValueError, TypeError):
                return default

        # Build normalized record with provenance
        obs_record = {
            "patient_id": self.patient_id,
            "timestamp": row["parsed_timestamp"],
            "simulated_arrival_time": datetime.utcnow(),
            "source": "csv_replay",
            "session_id": self.session_id,
            "row_index": self.current_index - 1,
            # Environmental
            "pm25_ug_m3": _safe_float(row.get("pm25_ug_m3"), 0.0),
            "pm10_ug_m3": _safe_float(row.get("pm10_ug_m3"), 0.0),
            "temperature_c": _safe_float(row.get("temperature_c"), 0.0),
            "humidity_pct": _safe_float(row.get("humidity_pct"), 0.0),
            "pollen_level": _safe_float(row.get("pollen_level_0_10"), 0.0),
            "dust_exposure_level": _safe_int(row.get("dust_exposure_level"), 0),
            # Activity & Physiology
            "exercise_flag": _safe_int(row.get("exercise_flag"), 0),
            "heart_rate_bpm": _safe_int(row.get("heart_rate_bpm"), 0),
            "respiratory_rate_bpm": _safe_int(row.get("respiratory_rate_bpm"), 0),
            "spo2_pct": _safe_float(row.get("spo2_pct"), 0.0),
            "peak_flow_pef_l_min": _safe_int(row.get("peak_flow_pef_l_min"), 0),
            "fev1_l": _safe_float(row.get("fev1_l"), 0.0),
            # Symptoms
            "wheezing": _safe_int(row.get("wheezing"), 0),
            "coughing": _safe_int(row.get("coughing"), 0),
            "shortness_of_breath": _safe_int(row.get("shortness_of_breath"), 0),
            "chest_tightness": _safe_int(row.get("chest_tightness"), 0),
            "symptom_severity": _safe_int(row.get("symptom_severity_0_3"), 0),
            "rescue_inhaler_uses": _safe_int(row.get("rescue_inhaler_uses"), 0),
            # Quality & Labels
            "source_risk_label": str(row.get("synthetic_flareup_risk", "low")),
            "quality_status": str(row.get("quality_status", "valid")),
            "quality_notes": str(row.get("quality_notes", "")),
        }
        return obs_record

    def get_recent_window(self, count: int = 48) -> pd.DataFrame:
        """Returns the slice of observations processed up to the current index."""
        if self.current_index == 0:
            return pd.DataFrame()
        start = max(0, self.current_index - count)
        return self.df.iloc[start:self.current_index].copy()
