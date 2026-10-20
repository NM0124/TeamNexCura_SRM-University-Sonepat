"""
Model Training Pipeline for Deterioration Event Risk.
Trains an interpretable baseline (Logistic Regression) and a candidate gradient booster (HistGradientBoosting),
evaluating chronologically without future leakage.
"""

from pathlib import Path
from typing import Dict, Any, Tuple, Optional
import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

from config.settings import settings, PROCESSED_DATA_DIR
from src.prediction.label_builder import LabelBuilder
from src.prediction.evaluation import ModelEvaluator, EvaluationMetrics
from src.digital_twin.feature_engineering import FeatureEngineer, FEATURE_NAMES


class ModelTrainer:
    def __init__(
        self,
        horizon_hours: int = 6,
        pef_threshold_pct: float = 0.85,
        model_save_dir: Optional[Path] = None
    ):
        self.horizon_hours = horizon_hours
        self.pef_threshold_pct = pef_threshold_pct
        self.model_save_dir = model_save_dir or PROCESSED_DATA_DIR
        self.model_save_dir.mkdir(parents=True, exist_ok=True)

    def prepare_dataset(self, df_raw: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, pd.DataFrame]:
        """Constructs leakage-safe feature matrix X and forward label vector y."""
        # 1. Forward Labels
        lb = LabelBuilder(
            horizon_hours=self.horizon_hours,
            pef_threshold_pct=self.pef_threshold_pct,
            consecutive_readings=2
        )
        df_labeled = lb.build_labels(df_raw)
        evaluable_df = df_labeled[df_labeled["is_label_evaluable"]].reset_index(drop=True)

        # 2. Extract features row-by-row strictly using history
        X_rows = []
        y_rows = []

        raw_records = evaluable_df.to_dict(orient="records")
        for i, row in enumerate(raw_records):
            past_slice = raw_records[:i]
            features_dict = FeatureEngineer.extract_features(
                current_obs=row,
                past_observations=past_slice,
                pef_reference=float(np.quantile(evaluable_df["peak_flow_pef_l_min"], 0.85))
            )
            vec = FeatureEngineer.to_feature_vector(features_dict)
            X_rows.append(vec)
            y_rows.append(int(row["future_pef_deterioration_label"]))

        X = np.array(X_rows, dtype=np.float32)
        y = np.array(y_rows, dtype=int)
        return X, y, evaluable_df

    def train_and_evaluate(self, df_raw: pd.DataFrame) -> Dict[str, Any]:
        """Trains both models and returns performance comparisons and saved paths."""
        X, y, df_eval = self.prepare_dataset(df_raw)
        n = len(X)
        split_idx = int(n * 0.70)  # Chronological 70/30 split

        X_train, X_test = X[:split_idx], X[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]

        # 1. Baseline: Scaled Logistic Regression
        lr_pipe = Pipeline([
            ("scaler", StandardScaler()),
            ("classifier", LogisticRegression(class_weight="balanced", max_iter=1000, random_state=42))
        ])
        lr_pipe.fit(X_train, y_train)
        lr_pred = lr_pipe.predict(X_test)
        lr_prob = lr_pipe.predict_proba(X_test)[:, 1] if len(lr_pipe.classes_) > 1 else None
        lr_metrics = ModelEvaluator.evaluate_predictions(
            model_name="Interpretable Baseline (Logistic Regression)",
            y_true=y_test,
            y_pred=lr_pred,
            y_prob=lr_prob,
            train_count=len(y_train),
            split_method="chronological_single_patient"
        )

        # 2. Candidate: HistGradientBoosting
        hgb = HistGradientBoostingClassifier(
            class_weight="balanced",
            max_iter=100,
            random_state=42,
            min_samples_leaf=10
        )
        hgb.fit(X_train, y_train)
        hgb_pred = hgb.predict(X_test)
        hgb_prob = hgb.predict_proba(X_test)[:, 1] if len(hgb.classes_) > 1 else None
        hgb_metrics = ModelEvaluator.evaluate_predictions(
            model_name="Candidate Model (HistGradientBoosting)",
            y_true=y_test,
            y_pred=hgb_pred,
            y_prob=hgb_prob,
            train_count=len(y_train),
            split_method="chronological_single_patient"
        )

        # Save artifacts
        lr_path = self.model_save_dir / "baseline_logistic.joblib"
        hgb_path = self.model_save_dir / "candidate_hgb.joblib"
        meta_path = self.model_save_dir / "model_metadata.joblib"

        joblib.dump(lr_pipe, lr_path)
        joblib.dump(hgb, hgb_path)

        metadata = {
            "feature_names": FEATURE_NAMES,
            "horizon_hours": self.horizon_hours,
            "pef_threshold_pct": self.pef_threshold_pct,
            "train_samples": len(y_train),
            "test_samples": len(y_test),
            "lr_metrics": lr_metrics.dict(),
            "hgb_metrics": hgb_metrics.dict(),
        }
        joblib.dump(metadata, meta_path)

        return {
            "baseline_metrics": lr_metrics,
            "candidate_metrics": hgb_metrics,
            "lr_path": lr_path,
            "hgb_path": hgb_path,
            "metadata": metadata
        }
