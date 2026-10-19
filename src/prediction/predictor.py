"""
Prediction Service and Risk Inference Engine.
Applies trained models or transparent rule-based indicators to estimate
future deterioration event risk while safely abstaining when data quality is insufficient.
"""

from typing import Dict, Any, Optional, Tuple
from datetime import datetime
import numpy as np

from src.digital_twin.patient_twin import PatientTwin
from src.digital_twin.feature_engineering import FeatureEngineer, FEATURE_NAMES
from src.prediction.model_registry import ModelRegistry


class RiskPredictor:
    @staticmethod
    def evaluate_risk(
        twin: PatientTwin,
        use_ml_model: bool = True
    ) -> Dict[str, Any]:
        """
        Calculates deterioration risk for the patient's current state.
        Respects safe abstention rules if data quality is insufficient.
        """
        curr_obs = twin.current_observation
        quality = twin.quality_assessment
        now = datetime.utcnow()

        if not curr_obs:
            return {
                "patient_id": twin.patient_id,
                "prediction_timestamp": now,
                "observation_cutoff_time": now,
                "model_name": "abstention_engine",
                "risk_score": None,
                "risk_category": "withheld",
                "withheld": True,
                "withhold_reason": "No observations available for patient.",
                "feature_contributions": {},
                "data_quality_status": "data_incomplete"
            }

        obs_time = curr_obs["timestamp"]
        if isinstance(obs_time, str):
            obs_time = datetime.fromisoformat(obs_time)

        # 1. Check Safe Abstention Conditions
        if quality.withhold_prediction:
            return {
                "patient_id": twin.patient_id,
                "prediction_timestamp": now,
                "observation_cutoff_time": obs_time,
                "model_name": "abstention_engine",
                "risk_score": None,
                "risk_category": "withheld",
                "withheld": True,
                "withhold_reason": quality.withhold_reason or "Unreliable or missing input measurements.",
                "feature_contributions": {},
                "data_quality_status": quality.status
            }

        # 2. Rule-Based Clinical Indicator (Always computed as clinical reference)
        rule_score, rule_cat, rule_drivers = RiskPredictor._evaluate_clinical_rules(twin)

        # 3. ML Model Inference if available
        ml_model = ModelRegistry.get_candidate_model() or ModelRegistry.get_baseline_model()
        if use_ml_model and ml_model is not None and twin.current_features:
            try:
                feature_vec = FeatureEngineer.to_feature_vector(twin.current_features).reshape(1, -1)
                proba = float(ml_model.predict_proba(feature_vec)[0, 1])

                # Determine ML risk category
                if proba < 0.25:
                    cat = "low"
                elif proba < 0.65:
                    cat = "moderate"
                else:
                    cat = "high"

                # Feature contributions (weights * scaled features or top active drivers)
                contributions = RiskPredictor._approximate_feature_contributions(twin.current_features)

                pred_result = {
                    "patient_id": twin.patient_id,
                    "prediction_timestamp": now,
                    "observation_cutoff_time": obs_time,
                    "model_name": "Candidate HistGradientBoosting" if ModelRegistry.get_candidate_model() else "Baseline LogisticRegression",
                    "risk_score": round(proba, 4),
                    "risk_category": cat,
                    "withheld": False,
                    "withhold_reason": None,
                    "feature_contributions": contributions,
                    "data_quality_status": quality.status,
                    "rule_reference_category": rule_cat
                }
                twin.add_prediction(pred_result)
                return pred_result
            except Exception as e:
                pass

        # Fallback to transparent rule-based estimation
        pred_result = {
            "patient_id": twin.patient_id,
            "prediction_timestamp": now,
            "observation_cutoff_time": obs_time,
            "model_name": "transparent_clinical_rules",
            "risk_score": round(rule_score, 4),
            "risk_category": rule_cat,
            "withheld": False,
            "withhold_reason": None,
            "feature_contributions": rule_drivers,
            "data_quality_status": quality.status,
            "rule_reference_category": rule_cat
        }
        twin.add_prediction(pred_result)
        return pred_result

    @staticmethod
    def _evaluate_clinical_rules(twin: PatientTwin) -> Tuple[float, str, Dict[str, float]]:
        """
        Evidence-grounded heuristic rules based on standard asthma action plans (GINA):
        - PEF < 60% of baseline: Red Zone (High Risk)
        - PEF 60-80% of baseline or high rescue use: Yellow Zone (Moderate Risk)
        - PEF > 80% with low symptoms: Green Zone (Low Risk)
        """
        feats = twin.current_features
        if not feats:
            return 0.1, "low", {}

        pef_pct = feats.get("pef_pct_of_reference", 1.0)
        rescue_6h = feats.get("rescue_inhaler_6h_sum", 0.0)
        sym_max = feats.get("symptom_severity_6h_max", 0.0)
        pm25 = feats.get("pm25_current", 15.0)
        pollen = feats.get("pollen_level_current", 2.0)
        spo2 = feats.get("spo2_current", 98.0)

        risk_score = 0.05
        drivers: Dict[str, float] = {}

        # PEF Zones
        if pef_pct < 0.60:
            risk_score += 0.60
            drivers["Severe PEF Decline (<60% ref)"] = 0.60
        elif pef_pct < 0.80:
            risk_score += 0.35
            drivers["Moderate PEF Decline (60-80% ref)"] = 0.35

        # SpO2
        if spo2 < 92.0:
            risk_score += 0.40
            drivers["Critical Hypoxemia (SpO2 < 92%)"] = 0.40
        elif spo2 < 95.0:
            risk_score += 0.20
            drivers["Mild Hypoxemia (SpO2 < 95%)"] = 0.20

        # Rescue Inhaler
        if rescue_6h >= 2:
            risk_score += 0.25
            drivers[f"Elevated Rescue Inhaler Use ({int(rescue_6h)} uses/6h)"] = 0.25

        # Symptoms
        if sym_max >= 2:
            risk_score += 0.20
            drivers["Elevated Symptom Severity (>=2/3)"] = 0.20

        # Environmental Trigger Triggers
        if pm25 > 35.0:
            risk_score += 0.15
            drivers["Unhealthy Air Quality (PM2.5 > 35 µg/m³)"] = 0.15
        if pollen > 6.0:
            risk_score += 0.10
            drivers["High Pollen Count (>6/10)"] = 0.10

        risk_score = min(0.99, max(0.01, risk_score))

        if risk_score >= 0.65:
            cat = "high"
        elif risk_score >= 0.25:
            cat = "moderate"
        else:
            cat = "low"

        return risk_score, cat, drivers

    @staticmethod
    def _approximate_feature_contributions(features: Dict[str, float]) -> Dict[str, float]:
        """Provides intuitive relative importance ranking for key active drivers."""
        drivers = {}
        if features.get("pef_pct_of_reference", 1.0) < 0.85:
            drivers["Low Peak Expiratory Flow"] = round(1.0 - features.get("pef_pct_of_reference", 1.0), 3)
        if features.get("pm25_current", 0) > 25.0:
            drivers["Elevated PM2.5 Exposure"] = round(features.get("pm25_current", 0) / 100.0, 3)
        if features.get("pollen_level_current", 0) > 5.0:
            drivers["Elevated Pollen Exposure"] = round(features.get("pollen_level_current", 0) / 10.0, 3)
        if features.get("rescue_inhaler_6h_sum", 0) > 0:
            drivers["Recent Inhaler Usage"] = round(features.get("rescue_inhaler_6h_sum", 0) * 0.2, 3)
        if features.get("symptom_severity_6h_max", 0) > 0:
            drivers["Active Respiratory Symptoms"] = round(features.get("symptom_severity_6h_max", 0) * 0.25, 3)
        if features.get("respiratory_rate_current", 16) > 20:
            drivers["Tachypnea (Elevated Respiratory Rate)"] = 0.2
        return drivers
