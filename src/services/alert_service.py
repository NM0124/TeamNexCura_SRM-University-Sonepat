"""
Alerting Service for Early Warning and Safety Detection.
Monitors physiological thresholds, rapid declines, inhaler spikes, and air quality hazards.
Prevents duplicate alert spamming and supports clinical acknowledgement.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

from src.digital_twin.patient_twin import PatientTwin
from src.storage.database import get_db_session
from src.storage.repositories import AlertRepository


class AlertService:
    @staticmethod
    def evaluate_and_generate_alerts(
        twin: PatientTwin,
        prediction_result: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Evaluates safety thresholds and model predictions, raising deduplicated alerts.
        """
        curr = twin.current_observation
        if not curr:
            return []

        alerts_to_add: List[Dict[str, Any]] = []
        now = datetime.utcnow()
        obs_time = curr["timestamp"]
        if isinstance(obs_time, str):
            obs_time = datetime.fromisoformat(obs_time)

        pef = float(curr.get("peak_flow_pef_l_min", 400))
        pef_ref = float(twin.baseline_state.pef_reference_value)
        pef_pct = pef / pef_ref if pef_ref > 0 else 1.0
        spo2 = float(curr.get("spo2_pct", 98.0))
        inhaler_6h = float(twin.current_features.get("rescue_inhaler_6h_sum", 0.0))
        pm25 = float(curr.get("pm25_ug_m3", 15.0))

        # 1. Critical PEF Decline (< 60% of reference)
        if pef_pct < 0.60:
            alerts_to_add.append({
                "patient_id": twin.patient_id,
                "alert_type": "critical_pef_decline",
                "severity": "critical",
                "title": "Red Zone Alert: Severe PEF Decline (< 60% reference)",
                "message": f"Observed PEF {int(pef)} L/min is {int(pef_pct * 100)}% of reference ({int(pef_ref)} L/min). Immediate clinical review recommended.",
                "source_component": "physiological_rule",
                "trigger_observation_time": obs_time,
                "created_at": now,
                "acknowledged": False
            })
        elif pef_pct < 0.80:
            alerts_to_add.append({
                "patient_id": twin.patient_id,
                "alert_type": "moderate_pef_decline",
                "severity": "warning",
                "title": "Yellow Zone Alert: Moderate PEF Decline (60-80% reference)",
                "message": f"Observed PEF {int(pef)} L/min is {int(pef_pct * 100)}% of reference ({int(pef_ref)} L/min). Monitor closely.",
                "source_component": "physiological_rule",
                "trigger_observation_time": obs_time,
                "created_at": now,
                "acknowledged": False
            })

        # 2. Critical Hypoxemia
        if spo2 < 92.0:
            alerts_to_add.append({
                "patient_id": twin.patient_id,
                "alert_type": "hypoxemia_critical",
                "severity": "critical",
                "title": "Critical Hypoxemia (SpO2 < 92%)",
                "message": f"Pulse oximetry reading SpO2 is {spo2}%. Risk of respiratory compromise.",
                "source_component": "physiological_rule",
                "trigger_observation_time": obs_time,
                "created_at": now,
                "acknowledged": False
            })

        # 3. Rescue Inhaler Cluster
        if inhaler_6h >= 2:
            alerts_to_add.append({
                "patient_id": twin.patient_id,
                "alert_type": "inhaler_overuse",
                "severity": "warning",
                "title": f"Frequent Rescue Inhaler Usage ({int(inhaler_6h)} uses in 6 hours)",
                "message": "Patient has used rescue bronchodilator multiple times in 6-hour window, suggesting uncontrolled bronchospasm.",
                "source_component": "symptom_rule",
                "trigger_observation_time": obs_time,
                "created_at": now,
                "acknowledged": False
            })

        # 4. Severe Environmental Air Quality Hazard
        if pm25 >= 50.0:
            alerts_to_add.append({
                "patient_id": twin.patient_id,
                "alert_type": "severe_pm25_hazard",
                "severity": "warning",
                "title": f"Elevated PM2.5 Environmental Hazard ({pm25} µg/m³)",
                "message": "Ambient fine particulate matter exceeds unhealthy thresholds. High risk of airway irritation.",
                "source_component": "environmental_rule",
                "trigger_observation_time": obs_time,
                "created_at": now,
                "acknowledged": False
            })

        # 5. Model High-Risk Deterioration Alert
        if prediction_result and prediction_result.get("risk_category") == "high":
            score = prediction_result.get("risk_score", "N/A")
            alerts_to_add.append({
                "patient_id": twin.patient_id,
                "alert_type": "model_high_risk",
                "severity": "critical",
                "title": f"High Deterioration Risk Estimated (Score: {score})",
                "message": f"Predictive model indicates elevated risk of PEF deterioration within next 6 hours. Primary drivers: {list(prediction_result.get('feature_contributions', {}).keys())[:2]}",
                "source_component": prediction_result.get("model_name", "predictive_model"),
                "trigger_observation_time": obs_time,
                "created_at": now,
                "acknowledged": False
            })

        # Deduplication against recently active unacknowledged alerts of same type
        new_alerts = []
        for a in alerts_to_add:
            is_dup = False
            for existing in twin.active_alerts:
                if existing.get("alert_type") == a["alert_type"] and not existing.get("acknowledged", False):
                    is_dup = True
                    break
            if not is_dup:
                twin.add_alert(a)
                new_alerts.append(a)
                # Persist to local database
                try:
                    with get_db_session() as session:
                        repo = AlertRepository(session)
                        repo.add(a)
                except Exception:
                    pass

        return new_alerts
