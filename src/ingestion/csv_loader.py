"""
CSV Data Loader and Quality Validator.
Reads wearable/environmental time-series CSVs, validates schema, checks ranges,
detects duplicate/missing timestamps, and attaches data-quality flags.
"""

from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional
import pandas as pd
import numpy as np


EXPECTED_COLUMNS = [
    "timestamp",
    "pm25_ug_m3",
    "pm10_ug_m3",
    "temperature_c",
    "humidity_pct",
    "pollen_level_0_10",
    "dust_exposure_level",
    "exercise_flag",
    "wheezing",
    "coughing",
    "shortness_of_breath",
    "chest_tightness",
    "symptom_severity_0_3",
    "heart_rate_bpm",
    "respiratory_rate_bpm",
    "spo2_pct",
    "peak_flow_pef_l_min",
    "fev1_l",
    "rescue_inhaler_uses",
    "synthetic_flareup_risk",
]

# Physiologically & environmentally plausible ranges
RANGE_CHECKS = {
    "pm25_ug_m3": (0.0, 500.0),
    "pm10_ug_m3": (0.0, 1000.0),
    "temperature_c": (-20.0, 55.0),
    "humidity_pct": (0.0, 100.0),
    "pollen_level_0_10": (0.0, 10.0),
    "dust_exposure_level": (0, 10),
    "exercise_flag": (0, 1),
    "wheezing": (0, 1),
    "coughing": (0, 1),
    "shortness_of_breath": (0, 1),
    "chest_tightness": (0, 1),
    "symptom_severity_0_3": (0, 3),
    "heart_rate_bpm": (35, 220),
    "respiratory_rate_bpm": (6, 60),
    "spo2_pct": (60.0, 100.0),
    "peak_flow_pef_l_min": (50, 950),
    "fev1_l": (0.5, 7.0),
    "rescue_inhaler_uses": (0, 20),
}


class CSVValidationError(Exception):
    """Raised when CSV fails required structural validation."""
    pass


class CSVLoader:
    def __init__(self, file_path: Path):
        self.file_path = Path(file_path)
        self.validation_report: Dict[str, Any] = {}
        self.df_clean: Optional[pd.DataFrame] = None

    def validate_and_load(self) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """Loads and thoroughly validates the CSV time series."""
        if not self.file_path.exists():
            raise FileNotFoundError(f"Source file not found at: {self.file_path}")

        try:
            df = pd.read_csv(self.file_path)
        except Exception as e:
            raise CSVValidationError(f"Could not parse CSV file: {str(e)}")

        report: Dict[str, Any] = {
            "source_file": str(self.file_path),
            "raw_row_count": len(df),
            "missing_columns": [],
            "duplicate_timestamps": 0,
            "missing_values": {},
            "implausible_values": {},
            "quality_flags_summary": {},
            "is_valid": True,
        }

        # 1. Required column validation
        missing_cols = [col for col in EXPECTED_COLUMNS if col not in df.columns]
        if missing_cols:
            report["missing_columns"] = missing_cols
            report["is_valid"] = False
            raise CSVValidationError(f"Missing required columns in CSV: {missing_cols}")

        # 2. Datetime parsing & sorting
        try:
            df["parsed_timestamp"] = pd.to_datetime(df["timestamp"])
        except Exception as e:
            raise CSVValidationError(f"Invalid timestamp format in CSV: {str(e)}")

        df = df.sort_values(by="parsed_timestamp").reset_index(drop=True)

        # 3. Duplicate timestamp detection
        dup_count = df.duplicated(subset=["parsed_timestamp"]).sum()
        report["duplicate_timestamps"] = int(dup_count)
        if dup_count > 0:
            # We flag duplicates but don't drop silently
            df["is_duplicate_timestamp"] = df.duplicated(subset=["parsed_timestamp"], keep=False)
        else:
            df["is_duplicate_timestamp"] = False

        # 4. Missing value detection
        for col in EXPECTED_COLUMNS:
            null_count = int(df[col].isnull().sum())
            if null_count > 0:
                report["missing_values"][col] = null_count

        # 5. Range checks & data quality flags
        df["quality_status"] = "valid"
        df["quality_notes"] = ""

        implausible_count = 0
        for col, (min_val, max_val) in RANGE_CHECKS.items():
            if col in df.columns:
                out_of_bounds = (df[col] < min_val) | (df[col] > max_val)
                count = int(out_of_bounds.sum())
                if count > 0:
                    report["implausible_values"][col] = count
                    implausible_count += count
                    df.loc[out_of_bounds, "quality_status"] = "implausible_measurement"
                    notes = f"{col} out of bounds [{min_val}, {max_val}]; "
                    df.loc[out_of_bounds, "quality_notes"] = df.loc[out_of_bounds, "quality_notes"] + notes

        # Flag missing values
        null_rows = df[EXPECTED_COLUMNS].isnull().any(axis=1)
        if null_rows.any():
            df.loc[null_rows, "quality_status"] = "missing_fields"

        # Categorical check
        valid_risk_labels = {"low", "moderate", "high"}
        invalid_risk = ~df["synthetic_flareup_risk"].isin(valid_risk_labels)
        if invalid_risk.any():
            df.loc[invalid_risk, "quality_status"] = "invalid_category"
            report["implausible_values"]["synthetic_flareup_risk"] = int(invalid_risk.sum())

        report["quality_flags_summary"] = df["quality_status"].value_counts().to_dict()
        report["timestamp_start"] = str(df["parsed_timestamp"].min())
        report["timestamp_end"] = str(df["parsed_timestamp"].max())
        report["total_observations"] = len(df)

        self.validation_report = report
        self.df_clean = df
        return df, report
