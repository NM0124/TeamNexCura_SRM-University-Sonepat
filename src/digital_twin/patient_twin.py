"""
Patient Digital Twin Virtual State Representation.
Maintains independent state, time-series observations, personalized baseline,
quality status, predictions, alerts, and timeline for an individual patient.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import copy
from pydantic import BaseModel, Field

from src.ingestion.schema_normalizer import NormalizedEHRProfile
from src.digital_twin.baseline_manager import BaselineManager, BaselineState
from src.digital_twin.data_quality import DataQualityEvaluator, DataQualityAssessment
from src.digital_twin.feature_engineering import FeatureEngineer, FEATURE_NAMES


class PatientTwin:
    def __init__(self, patient_id: str, ehr_profile: Optional[NormalizedEHRProfile] = None):
        self.patient_id = patient_id
        self.ehr_profile = ehr_profile
        self.observations: List[Dict[str, Any]] = []
        self.current_observation: Optional[Dict[str, Any]] = None
        self.current_features: Dict[str, float] = {}
        self.latest_prediction: Optional[Dict[str, Any]] = None
        self.prediction_history: List[Dict[str, Any]] = []
        self.active_alerts: List[Dict[str, Any]] = []
        self.scenario_history: List[Dict[str, Any]] = []
        self.timeline_events: List[Dict[str, Any]] = []

        # Initialize baseline state
        pb_pef = None
        if self.ehr_profile and self.ehr_profile.asthma_history:
            pb_pef = self.ehr_profile.asthma_history.clinical_personal_best_pef

        self.baseline_state = BaselineManager.calculate_baseline(
            patient_id=patient_id,
            observations=[],
            current_time=datetime.utcnow(),
            clinical_personal_best=pb_pef
        )
        self.quality_assessment = DataQualityAssessment(
            status="baseline_provisional",
            flags=["initial_state_empty"]
        )

    def ingest_observation(self, obs: Dict[str, Any]) -> DataQualityAssessment:
        """
        Incrementally ingests a new observation, updating state without future leakage.
        """
        self.observations.append(obs)
        self.current_observation = obs
        obs_time = obs["timestamp"]
        if isinstance(obs_time, str):
            obs_time = datetime.fromisoformat(obs_time)

        # 1. Evaluate Data Quality
        past_slice = self.observations[:-1]
        self.quality_assessment = DataQualityEvaluator.evaluate(
            current_obs=obs,
            recent_history=past_slice
        )

        # 2. Update Baseline using only valid past observations
        pb_pef = self.ehr_profile.asthma_history.clinical_personal_best_pef if self.ehr_profile else None
        self.baseline_state = BaselineManager.calculate_baseline(
            patient_id=self.patient_id,
            observations=self.observations,
            current_time=obs_time,
            clinical_personal_best=pb_pef
        )

        # 3. Extract Features
        age = self.ehr_profile.demographics.age if self.ehr_profile else 38
        emergencies = self.ehr_profile.asthma_history.emergency_visits_count if self.ehr_profile else 0
        allergies = len(self.ehr_profile.allergies) if self.ehr_profile else 0

        self.current_features = FeatureEngineer.extract_features(
            current_obs=obs,
            past_observations=past_slice,
            pef_reference=self.baseline_state.pef_reference_value,
            patient_age=age,
            historical_emergency_count=emergencies,
            documented_allergy_count=allergies
        )

        # 4. Record Timeline event
        self.add_timeline_event(
            event_type="observation",
            timestamp=obs_time,
            summary=f"New observation: PEF {obs.get('peak_flow_pef_l_min')} L/min, SpO2 {obs.get('spo2_pct')}%, PM2.5 {obs.get('pm25_ug_m3')} µg/m³"
        )

        return self.quality_assessment

    def add_prediction(self, prediction_dict: Dict[str, Any]):
        self.latest_prediction = prediction_dict
        self.prediction_history.append(prediction_dict)
        pred_time = prediction_dict.get("prediction_timestamp", datetime.utcnow())
        self.add_timeline_event(
            event_type="prediction",
            timestamp=pred_time,
            summary=f"Risk estimated: {prediction_dict.get('risk_category', 'unknown').upper()} (Score: {prediction_dict.get('risk_score', 'N/A')})"
        )

    def add_alert(self, alert_dict: Dict[str, Any]):
        self.active_alerts.append(alert_dict)
        alert_time = alert_dict.get("created_at", datetime.utcnow())
        self.add_timeline_event(
            event_type="alert",
            timestamp=alert_time,
            summary=f"Alert: {alert_dict.get('title', 'Warning')}"
        )

    def acknowledge_alert(self, alert_index: int):
        if 0 <= alert_index < len(self.active_alerts):
            self.active_alerts[alert_index]["acknowledged"] = True

    def add_timeline_event(self, event_type: str, timestamp: datetime, summary: str, details: Optional[Dict] = None, is_hypothetical: bool = False):
        self.timeline_events.append({
            "event_type": event_type,
            "timestamp": timestamp,
            "summary": summary,
            "details": details or {},
            "is_hypothetical": is_hypothetical
        })

    def create_scenario_copy(self) -> "PatientTwin":
        """
        Creates an isolated deep copy for what-if scenario testing without mutating original state.
        """
        clone = PatientTwin(patient_id=self.patient_id, ehr_profile=self.ehr_profile)
        clone.observations = copy.deepcopy(self.observations)
        clone.current_observation = copy.deepcopy(self.current_observation)
        clone.current_features = copy.deepcopy(self.current_features)
        clone.baseline_state = copy.deepcopy(self.baseline_state)
        clone.latest_prediction = copy.deepcopy(self.latest_prediction)
        clone.quality_assessment = copy.deepcopy(self.quality_assessment)
        clone.active_alerts = copy.deepcopy(self.active_alerts)
        return clone

    def reset_state(self):
        """Resets dynamic observations and predictions while preserving static EHR profile."""
        self.observations.clear()
        self.current_observation = None
        self.current_features.clear()
        self.latest_prediction = None
        self.prediction_history.clear()
        self.active_alerts.clear()
        self.timeline_events.clear()
        self.scenario_history.clear()
        pb_pef = self.ehr_profile.asthma_history.clinical_personal_best_pef if self.ehr_profile else None
        self.baseline_state = BaselineManager.calculate_baseline(
            patient_id=self.patient_id,
            observations=[],
            current_time=datetime.utcnow(),
            clinical_personal_best=pb_pef
        )
        self.quality_assessment = DataQualityAssessment(
            status="baseline_provisional",
            flags=["reset_empty"]
        )
