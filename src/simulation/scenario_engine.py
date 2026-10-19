"""
Scenario Simulation Engine ("What-If" Analysis).
Simulates hypothetical environmental exposures, physiological shifts, or interventions
on an isolated twin copy without mutating live patient state.
"""

from typing import Dict, Any, Optional
from datetime import datetime
import copy

from src.digital_twin.patient_twin import PatientTwin
from src.prediction.predictor import RiskPredictor
from src.digital_twin.feature_engineering import FeatureEngineer


class ScenarioEngine:
    @staticmethod
    def run_hypothetical_scenario(
        twin: PatientTwin,
        delta_pm25: float = 0.0,
        delta_pollen: float = 0.0,
        delta_dust: int = 0,
        pef_multiplier: float = 1.0,
        trigger_exercise: Optional[int] = None,
        rescue_inhaler_uses: Optional[int] = None,
        scenario_name: str = "Custom What-If Scenario"
    ) -> Dict[str, Any]:
        """
        Runs a simulation on an isolated clone of the patient twin.
        Returns side-by-side comparison with original observed state.
        """
        if not twin.current_observation:
            return {
                "status": "error",
                "message": "Cannot simulate scenario: Twin has no current observation.",
                "is_hypothetical": True
            }

        # 1. Deep clone the twin to guarantee isolation
        hypo_twin = twin.create_scenario_copy()

        # 2. Modify clone's current observation
        curr = copy.deepcopy(hypo_twin.current_observation)

        original_pm25 = float(curr.get("pm25_ug_m3", 15.0))
        original_pollen = float(curr.get("pollen_level", curr.get("pollen_level_0_10", 2.0)))
        original_dust = int(curr.get("dust_exposure_level", 0))
        original_pef = float(curr.get("peak_flow_pef_l_min", 400.0))
        original_exercise = int(curr.get("exercise_flag", 0))
        original_inhaler = int(curr.get("rescue_inhaler_uses", 0))

        # Apply hypothetical parameters
        new_pm25 = max(0.0, original_pm25 + delta_pm25)
        new_pollen = max(0.0, min(10.0, original_pollen + delta_pollen))
        new_dust = max(0, min(5, original_dust + delta_dust))
        new_pef = max(50.0, min(800.0, original_pef * pef_multiplier))
        new_exercise = trigger_exercise if trigger_exercise is not None else original_exercise
        new_inhaler = rescue_inhaler_uses if rescue_inhaler_uses is not None else original_inhaler

        curr["pm25_ug_m3"] = new_pm25
        curr["pollen_level"] = new_pollen
        curr["pollen_level_0_10"] = new_pollen
        curr["dust_exposure_level"] = new_dust
        curr["peak_flow_pef_l_min"] = int(new_pef)
        curr["exercise_flag"] = new_exercise
        curr["rescue_inhaler_uses"] = new_inhaler

        # If PEF drops severely in scenario, simulate plausible physiological accompaniment
        if pef_multiplier < 0.80:
            curr["wheezing"] = 1
            curr["symptom_severity"] = max(curr.get("symptom_severity", 0), 2)
            curr["spo2_pct"] = max(90.0, float(curr.get("spo2_pct", 98.0)) - 2.5)

        hypo_twin.current_observation = curr

        # 3. Re-extract features on modified state
        age = hypo_twin.ehr_profile.demographics.age if hypo_twin.ehr_profile else 38
        emergencies = hypo_twin.ehr_profile.asthma_history.emergency_visits_count if hypo_twin.ehr_profile else 0
        allergies = len(hypo_twin.ehr_profile.allergies) if hypo_twin.ehr_profile else 0

        hypo_twin.current_features = FeatureEngineer.extract_features(
            current_obs=curr,
            past_observations=hypo_twin.observations[:-1],
            pef_reference=hypo_twin.baseline_state.pef_reference_value,
            patient_age=age,
            historical_emergency_count=emergencies,
            documented_allergy_count=allergies
        )

        # 4. Predict risk on hypothetical twin
        hypo_pred = RiskPredictor.evaluate_risk(hypo_twin, use_ml_model=True)

        # 5. Retrieve baseline prediction from real twin
        baseline_pred = twin.latest_prediction or RiskPredictor.evaluate_risk(twin, use_ml_model=True)

        base_score = baseline_pred.get("risk_score") or 0.0
        hypo_score = hypo_pred.get("risk_score") or 0.0
        risk_delta = round(hypo_score - base_score, 4)

        result = {
            "scenario_name": scenario_name,
            "patient_id": twin.patient_id,
            "simulated_at": datetime.utcnow().isoformat(),
            "is_hypothetical": True,
            "baseline_state": {
                "pm25_ug_m3": round(original_pm25, 1),
                "pollen_level": round(original_pollen, 1),
                "dust_exposure": original_dust,
                "pef_l_min": int(original_pef),
                "exercise_flag": original_exercise,
                "risk_score": base_score,
                "risk_category": baseline_pred.get("risk_category", "low"),
            },
            "hypothetical_state": {
                "pm25_ug_m3": round(new_pm25, 1),
                "pollen_level": round(new_pollen, 1),
                "dust_exposure": new_dust,
                "pef_l_min": int(new_pef),
                "exercise_flag": new_exercise,
                "risk_score": hypo_score,
                "risk_category": hypo_pred.get("risk_category", "low"),
            },
            "risk_delta": risk_delta,
            "hypothetical_contributing_features": hypo_pred.get("feature_contributions", {}),
            "disclaimer": (
                "HYPOTHETICAL SIMULATION: This what-if projection does NOT alter real observations or patient state. "
                "Estimates are algorithm-generated prototypes and must not be used for drug dosing or medical decisions."
            )
        }

        # Record scenario in twin's scenario history (informational only)
        twin.scenario_history.append(result)
        return result
