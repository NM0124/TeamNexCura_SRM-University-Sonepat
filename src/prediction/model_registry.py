"""
Model Registry for loading and caching trained model pipelines and metadata.
"""

from pathlib import Path
from typing import Optional, Dict, Any
import joblib

from config.settings import settings, PROCESSED_DATA_DIR


class ModelRegistry:
    _baseline_model = None
    _candidate_model = None
    _metadata: Optional[Dict[str, Any]] = None

    @classmethod
    def load_models(cls, model_dir: Optional[Path] = None):
        target_dir = model_dir or PROCESSED_DATA_DIR
        lr_path = target_dir / "baseline_logistic.joblib"
        hgb_path = target_dir / "candidate_hgb.joblib"
        meta_path = target_dir / "model_metadata.joblib"

        if lr_path.exists():
            try:
                cls._baseline_model = joblib.load(lr_path)
            except Exception:
                cls._baseline_model = None

        if hgb_path.exists():
            try:
                cls._candidate_model = joblib.load(hgb_path)
            except Exception:
                cls._candidate_model = None

        if meta_path.exists():
            try:
                cls._metadata = joblib.load(meta_path)
            except Exception:
                cls._metadata = None

    @classmethod
    def get_baseline_model(cls):
        if cls._baseline_model is None:
            cls.load_models()
        return cls._baseline_model

    @classmethod
    def get_candidate_model(cls):
        if cls._candidate_model is None:
            cls.load_models()
        return cls._candidate_model

    @classmethod
    def get_metadata(cls) -> Dict[str, Any]:
        if cls._metadata is None:
            cls.load_models()
        return cls._metadata or {}
