"""
Monitoring and Replay Orchestration Service.
Drives continuous or stepped ingestion from replay engines, updating the target patient's twin,
triggering risk evaluations and alerting workflows.
"""

from typing import Dict, Any, Optional
from datetime import datetime
import pandas as pd

from src.ingestion.csv_stream_replay import CSVStreamReplay
from src.digital_twin.patient_twin import PatientTwin
from src.prediction.predictor import RiskPredictor
from src.services.alert_service import AlertService
from src.storage.database import get_db_session
from src.storage.repositories import ObservationRepository, PredictionRepository


class MonitoringService:
    def __init__(self, replay_engine: CSVStreamReplay, twin: PatientTwin):
        self.replay = replay_engine
        self.twin = twin

    def step_forward(self) -> Optional[Dict[str, Any]]:
        """
        Advances the replay engine by one observation, ingests it into the twin,
        evaluates risk, and generates alerts.
        """
        obs = self.replay.step()
        if not obs:
            return None

        # 1. Ingest into Digital Twin
        quality_eval = self.twin.ingest_observation(obs)

        # 2. Persist observation to SQLite
        try:
            with get_db_session() as session:
                obs_repo = ObservationRepository(session)
                obs_repo.add_or_update(obs)
        except Exception:
            pass

        # 3. Evaluate Deterioration Risk
        pred_result = RiskPredictor.evaluate_risk(self.twin, use_ml_model=True)

        # 4. Persist Prediction
        try:
            with get_db_session() as session:
                pred_repo = PredictionRepository(session)
                pred_repo.add({
                    "patient_id": self.twin.patient_id,
                    "prediction_timestamp": pred_result["prediction_timestamp"],
                    "observation_cutoff_time": pred_result["observation_cutoff_time"],
                    "model_name": pred_result["model_name"],
                    "risk_score": pred_result.get("risk_score"),
                    "risk_category": pred_result.get("risk_category", "unassessed"),
                    "withheld": pred_result.get("withheld", False),
                    "withhold_reason": pred_result.get("withhold_reason"),
                    "feature_contributions_json": str(pred_result.get("feature_contributions", {})),
                    "data_quality_status": pred_result.get("data_quality_status", "valid")
                })
        except Exception:
            pass

        # 5. Evaluate Alerts
        AlertService.evaluate_and_generate_alerts(self.twin, pred_result)

        return {
            "observation": obs,
            "prediction": pred_result,
            "quality": quality_eval,
            "processed_count": self.replay.processed_count,
            "remaining_count": self.replay.remaining_count
        }
