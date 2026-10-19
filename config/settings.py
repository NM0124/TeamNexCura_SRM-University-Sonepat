"""
Configuration settings for the Environment-Aware Asthma Digital Twin platform.
Supports loading from environment variables with sensible local defaults.
"""

from pathlib import Path
import os
from typing import Optional
from pydantic import BaseModel, Field

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
GENERATED_DATA_DIR = DATA_DIR / "generated"

DEFAULT_CSV_PATH = RAW_DATA_DIR / "synthetic_apple_health_asthma_timeseries.csv"
DEFAULT_SYNTHEA_DIR = RAW_DATA_DIR / "synthea"
DEFAULT_DB_PATH = PROCESSED_DATA_DIR / "asthma_twin.db"


class Settings(BaseModel):
    app_name: str = "Environment-Aware Asthma Digital Twin"
    app_version: str = "1.0.0-poc"
    is_poc: bool = True
    
    # Paths
    csv_data_path: Path = Field(default_factory=lambda: Path(os.getenv("CSV_DATA_PATH", str(DEFAULT_CSV_PATH))))
    synthea_dir: Path = Field(default_factory=lambda: Path(os.getenv("SYNTHEA_DATA_DIR", str(DEFAULT_SYNTHEA_DIR))))
    db_path: Path = Field(default_factory=lambda: Path(os.getenv("SQLITE_DB_PATH", str(DEFAULT_DB_PATH))))
    
    # Replay
    default_replay_interval_sec: float = Field(default=2.0)
    
    # Digital Twin Baseline & Risk
    baseline_window_hours: int = 72
    min_baseline_hours: int = 24  # Under this, baseline is provisional
    prediction_horizon_hours: int = 6
    pef_deterioration_threshold_pct: float = 0.80  # 80% of baseline reference
    stale_data_threshold_hours: int = 12

    class Config:
        arbitrary_types_allowed = True


# Global settings singleton
settings = Settings()
