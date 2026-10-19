"""
Personalized Environmental Trigger Fingerprint Engine (Innovation A).
Analyzes empirical temporal associations between environmental exposures and subsequent respiratory responses.
Calculates descriptive correlations across configurable lag windows (30m, 1h, 2h, 6h).
Strictly adheres to non-causal language and flags insufficient evidence when sample size is low.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import numpy as np
import pandas as pd


class EnvironmentalTriggerAnalyzer:
    ENV_VARIABLES = [
        ("pm25_ug_m3", "PM2.5 Exposure (> 50 µg/m³)", 50.0),
        ("pm10_ug_m3", "PM10 Coarse Particulates (> 90 µg/m³)", 90.0),
        ("pollen_level_0_10", "Pollen Concentration (>= 6.0/10)", 6.0),
        ("dust_exposure_level", "Dust Episode (Moderate/High)", 1.0),
        ("temperature_c", "Temperature Extremes (> 32°C)", 32.0),
        ("humidity_pct", "High Humidity (> 70%)", 70.0),
    ]

    LAG_WINDOWS_HOURS = {
        "30m": 0.5,
        "1h": 1.0,
        "2h": 2.0,
        "6h": 6.0
    }

    @classmethod
    def analyze_patient_triggers(
        cls,
        observations: List[Dict[str, Any]],
        patient_id: str,
        pef_reference: float = 400.0
    ) -> Dict[str, Any]:
        """
        Computes patient-specific environmental trigger associations across observation history.
        """
        if len(observations) < 3:
            return {
                "patient_id": patient_id,
                "status": "insufficient_data",
                "sample_count": len(observations),
                "event_count": 0,
                "disclaimer": "Insufficient longitudinal observations to evaluate environmental associations.",
                "associations": [],
                "primary_suspected_trigger": None,
                "non_causal_summary": "Data collection in progress. Minimum 3 observations required."
            }

        df = pd.DataFrame(observations).copy()
        if "timestamp" in df.columns:
            df["dt"] = pd.to_datetime(df["timestamp"])
            df = df.sort_values(by="dt").reset_index(drop=True)

        # Target response: subsequent PEF drop > 15% from reference or current baseline
        pef_thresh = pef_reference * 0.85
        pef_series = df["peak_flow_pef_l_min"] if "peak_flow_pef_l_min" in df.columns else pd.Series([pef_reference] * len(df))
        rr_series = df["respiratory_rate_bpm"] if "respiratory_rate_bpm" in df.columns else pd.Series([18.0] * len(df))
        if "symptom_severity_0_3" in df.columns:
            symp_series = df["symptom_severity_0_3"]
        elif "symptom_score" in df.columns:
            symp_series = df["symptom_score"] / 3.0
        else:
            symp_series = pd.Series([0] * len(df))

        df["pef_drop_event"] = (pef_series < pef_thresh).astype(int)
        df["resp_rate_elevated"] = (rr_series >= 22).astype(int)
        df["symptom_flare"] = (symp_series >= 2).astype(int)
        df["composite_deterioration"] = (
            (df["pef_drop_event"] == 1) | (df["resp_rate_elevated"] == 1) | (df["symptom_flare"] == 1)
        ).astype(int)

        total_obs = len(df)
        total_events = int(df["composite_deterioration"].sum())

        associations = []
        highest_assoc = None
        max_score = -1.0

        for env_col, label, threshold in cls.ENV_VARIABLES:
            if env_col not in df.columns:
                continue

            series_env = df[env_col].dropna()
            if len(series_env) == 0:
                continue

            is_elevated = (df[env_col] >= threshold).astype(int)
            exposure_count = int(is_elevated.sum())

            # Evaluate correlation across lag windows
            lag_results = {}
            for lag_name, lag_hrs in cls.LAG_WINDOWS_HOURS.items():
                # Shift deterioration backward by lag to evaluate subsequent response
                step_approx = max(1, int(round(lag_hrs)))
                subsequent_event = df["composite_deterioration"].shift(-step_approx).fillna(0)

                # Contingency matrix
                concurrence = int(((is_elevated == 1) & (subsequent_event == 1)).sum())
                sensitivity = (concurrence / exposure_count) if exposure_count > 0 else 0.0

                # Pearson correlation coefficient
                try:
                    corr = float(np.corrcoef(is_elevated, subsequent_event)[0, 1])
                    if np.isnan(corr):
                        corr = 0.0
                except Exception:
                    corr = 0.0

                lag_results[lag_name] = {
                    "correlation": round(corr, 3),
                    "subsequent_flare_rate": round(sensitivity, 3),
                    "exposed_events": concurrence
                }

            # Overall association score based on 1h - 2h lag
            score_1h = lag_results.get("1h", {}).get("correlation", 0.0)
            score_2h = lag_results.get("2h", {}).get("correlation", 0.0)
            peak_assoc = max(score_1h, score_2h, 0.0)

            # Categorize association strength
            if total_events < 3:
                evidence_level = "Insufficient Events"
            elif peak_assoc > 0.35:
                evidence_level = "Strong Association"
            elif peak_assoc > 0.18:
                evidence_level = "Moderate Association"
            elif peak_assoc > 0.05:
                evidence_level = "Mild Association"
            else:
                evidence_level = "No Apparent Association"

            assoc_entry = {
                "variable": env_col,
                "label": label,
                "threshold": threshold,
                "exposure_observations": exposure_count,
                "evidence_level": evidence_level,
                "peak_correlation": round(peak_assoc, 3),
                "lag_breakdown": lag_results,
                "non_causal_statement": f"Possible temporal association between elevated {label} and subsequent respiratory decline within 1-2 hours in this synthetic patient record."
            }
            associations.append(assoc_entry)

            if peak_assoc > max_score and evidence_level in ["Strong Association", "Moderate Association"]:
                max_score = peak_assoc
                highest_assoc = assoc_entry

        primary_trigger_text = highest_assoc["label"] if highest_assoc else "No dominant environmental trigger identified"
        summary_text = (
            f"Observed highest temporal association with {primary_trigger_text} (peak r = {max_score:.2f}). "
            "Note: Empirical association does not establish clinical causation."
            if highest_assoc else
            "Respiratory fluctuations did not show strong temporal alignment with recorded environmental spikes."
        )

        return {
            "patient_id": patient_id,
            "status": "evaluated",
            "total_observations": total_obs,
            "deterioration_events_count": total_events,
            "primary_suspected_trigger": primary_trigger_text,
            "peak_correlation": round(max_score, 3) if max_score > 0 else 0.0,
            "non_causal_summary": summary_text,
            "associations": sorted(associations, key=lambda x: x["peak_correlation"], reverse=True),
            "clinical_guidance": "Personalized environmental profile is descriptive for clinical demonstration and must not replace clinical allergy/provocation testing."
        }
