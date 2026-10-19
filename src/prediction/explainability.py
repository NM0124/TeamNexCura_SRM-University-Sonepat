"""
Explainability and Environmental Trigger Analysis Subsystem.
Computes prediction change explanations, lag correlations between exposures and symptoms,
and personalized trigger fingerprints with clinical caveats.
"""

from typing import List, Dict, Any, Optional, Tuple
import pandas as pd
import numpy as np


class ExplainabilityService:
    @staticmethod
    def explain_prediction_delta(
        current_prediction: Dict[str, Any],
        previous_prediction: Optional[Dict[str, Any]],
        new_observations: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Explains why risk estimate changed between two consecutive updates."""
        curr_score = current_prediction.get("risk_score")
        prev_score = previous_prediction.get("risk_score") if previous_prediction else None

        delta = None
        trend = "initial_prediction"
        if curr_score is not None and prev_score is not None:
            delta = round(curr_score - prev_score, 4)
            if delta > 0.05:
                trend = "increased_risk"
            elif delta < -0.05:
                trend = "decreased_risk"
            else:
                trend = "stable"

        # What new measurements arrived
        arrived_summary = []
        for obs in new_observations:
            arrived_summary.append({
                "timestamp": str(obs.get("timestamp")),
                "pef": obs.get("peak_flow_pef_l_min"),
                "spo2": obs.get("spo2_pct"),
                "pm25": obs.get("pm25_ug_m3"),
                "pollen": obs.get("pollen_level", obs.get("pollen_level_0_10")),
                "rescue_uses": obs.get("rescue_inhaler_uses", 0),
            })

        return {
            "current_score": curr_score,
            "previous_score": prev_score,
            "delta": delta,
            "trend": trend,
            "current_category": current_prediction.get("risk_category"),
            "previous_category": previous_prediction.get("risk_category") if previous_prediction else "None",
            "new_observations_count": len(new_observations),
            "new_observations_sample": arrived_summary[-5:] if arrived_summary else [],
            "contributing_features": current_prediction.get("feature_contributions", {}),
            "data_quality_status": current_prediction.get("data_quality_status", "valid"),
        }

    @staticmethod
    def calculate_trigger_fingerprint(
        observations: List[Dict[str, Any]],
        lag_hours: int = 3
    ) -> Dict[str, Any]:
        """
        Calculates patient-specific empirical associations between environmental exposures
        and subsequent changes in PEF / symptoms after `lag_hours`.
        Exhibits clinical caution and explicitly disclaims causality.
        """
        if len(observations) < 12:
            return {
                "status": "insufficient_data",
                "observations_analyzed": len(observations),
                "message": "Insufficient observation history (< 12 hours) to calculate meaningful trigger associations.",
                "associations": {}
            }

        df = pd.DataFrame(observations)
        if "parsed_timestamp" not in df.columns and "timestamp" in df.columns:
            df["parsed_timestamp"] = pd.to_datetime(df["timestamp"])
        df = df.sort_values(by="parsed_timestamp").reset_index(drop=True)

        # Calculate forward deterioration endpoint: PEF drop or symptom increase after lag_hours
        df["pef_drop_lag"] = df["peak_flow_pef_l_min"].shift(-lag_hours) - df["peak_flow_pef_l_min"]
        df["future_symptom_lag"] = df["symptom_severity"].shift(-lag_hours) if "symptom_severity" in df.columns else df.get("symptom_severity_0_3", 0).shift(-lag_hours)

        valid_df = df.dropna(subset=["pef_drop_lag"]).copy()
        if len(valid_df) < 10:
            return {
                "status": "insufficient_data",
                "observations_analyzed": len(valid_df),
                "message": "Not enough lagged paired records.",
                "associations": {}
            }

        associations = {}
        env_vars = {
            "pm25_ug_m3": "PM2.5 Particulate Matter",
            "pm10_ug_m3": "PM10 Coarse Dust",
            "pollen_level": "Airborne Pollen",
            "temperature_c": "Ambient Temperature",
            "humidity_pct": "Relative Humidity",
        }

        # Normalize column names if raw
        if "pollen_level" not in valid_df.columns and "pollen_level_0_10" in valid_df.columns:
            valid_df["pollen_level"] = valid_df["pollen_level_0_10"]

        for var, label in env_vars.items():
            if var in valid_df.columns:
                series = valid_df[var].dropna()
                if len(series) > 10 and series.std() > 0:
                    corr = float(valid_df[var].corr(valid_df["pef_drop_lag"]))
                    # High exposure threshold (75th percentile)
                    high_thresh = float(series.quantile(0.75))
                    high_mask = valid_df[var] >= high_thresh
                    mean_drop_high = float(valid_df.loc[high_mask, "pef_drop_lag"].mean()) if high_mask.sum() > 0 else 0.0
                    mean_drop_normal = float(valid_df.loc[~high_mask, "pef_drop_lag"].mean()) if (~high_mask).sum() > 0 else 0.0

                    associations[var] = {
                        "variable_name": label,
                        "correlation_with_pef_change": round(corr, 3),
                        "high_threshold": round(high_thresh, 1),
                        "mean_pef_change_high_exposure": round(mean_drop_high, 1),
                        "mean_pef_change_normal_exposure": round(mean_drop_normal, 1),
                        "possible_association": (
                            "Negative impact (PEF declines after elevated exposure)"
                            if mean_drop_high < mean_drop_normal - 5.0
                            else "No strong isolated association detected"
                        )
                    }

        return {
            "status": "computed",
            "observations_analyzed": len(valid_df),
            "lag_hours": lag_hours,
            "associations": associations,
            "disclaimer": (
                "NOTE: These associations represent empirical observations within this synthetic dataset. "
                "Temporal correlation does not imply clinical causation, and this is NOT a diagnostic allergy test."
            )
        }
