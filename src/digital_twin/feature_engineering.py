"""
Leakage-Safe Feature Engineering Pipeline for Asthma Deterioration Risk.
Extracts features strictly using current and historical observations (t <= t_pred).
Guarantees no future leakage. Excludes target labels from feature matrix.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import numpy as np
import pandas as pd

FEATURE_NAMES = [
    # Physiological & Respiratory
    "pef_current",
    "pef_pct_of_reference",
    "pef_6h_min",
    "pef_6h_mean",
    "pef_6h_slope",
    "respiratory_rate_current",
    "respiratory_rate_6h_mean",
    "respiratory_rate_6h_delta",
    "spo2_current",
    "spo2_6h_min",
    "heart_rate_current",
    "heart_rate_6h_mean",
    "exercise_flag",
    # Symptoms & Rescue
    "symptom_severity_current",
    "symptom_severity_6h_max",
    "wheezing_6h_sum",
    "coughing_6h_sum",
    "shortness_of_breath_6h_sum",
    "chest_tightness_6h_sum",
    "rescue_inhaler_6h_sum",
    "rescue_inhaler_24h_sum",
    # Environmental Exposures
    "pm25_current",
    "pm25_3h_mean",
    "pm25_6h_mean",
    "pm10_current",
    "pm10_3h_mean",
    "pollen_level_current",
    "pollen_3h_mean",
    "dust_exposure_level",
    "temperature_c",
    "humidity_pct",
    # Derived & Interactions
    "pm25_pollen_interaction",
    "dust_exercise_interaction",
    # Patient EHR Context
    "patient_age",
    "historical_emergency_count",
    "documented_allergy_count",
]


class FeatureEngineer:
    @staticmethod
    def extract_features(
        current_obs: Dict[str, Any],
        past_observations: List[Dict[str, Any]],
        pef_reference: float = 400.0,
        patient_age: Optional[int] = 38,
        historical_emergency_count: int = 0,
        documented_allergy_count: int = 0
    ) -> Dict[str, float]:
        """
        Extracts feature map strictly from data available at or before current_obs['timestamp'].
        """
        t_curr = current_obs.get("timestamp")
        if isinstance(t_curr, str):
            t_curr = datetime.fromisoformat(t_curr)

        # Filter past window up to 24h
        t_24h = t_curr - timedelta(hours=24)
        t_6h = t_curr - timedelta(hours=6)
        t_3h = t_curr - timedelta(hours=3)

        window_24h = [
            obs for obs in past_observations
            if t_24h <= (datetime.fromisoformat(obs["timestamp"]) if isinstance(obs["timestamp"], str) else obs["timestamp"]) <= t_curr
        ]
        # Include current obs in window
        all_window = window_24h + [current_obs]

        df_all = pd.DataFrame(all_window)
        if "timestamp" in df_all.columns:
            df_all["dt"] = pd.to_datetime(df_all["timestamp"])
            df_all = df_all.sort_values(by="dt")

        df_6h = df_all[df_all["dt"] >= t_6h] if not df_all.empty else pd.DataFrame()
        df_3h = df_all[df_all["dt"] >= t_3h] if not df_all.empty else pd.DataFrame()

        # PEF features
        pef_curr = float(current_obs.get("peak_flow_pef_l_min", pef_reference))
        ref_val = pef_reference if pef_reference > 0 else 400.0
        pef_pct = float(pef_curr / ref_val)

        pef_6h_min = float(df_6h["peak_flow_pef_l_min"].min()) if (not df_6h.empty and "peak_flow_pef_l_min" in df_6h.columns) else pef_curr
        pef_6h_mean = float(df_6h["peak_flow_pef_l_min"].mean()) if (not df_6h.empty and "peak_flow_pef_l_min" in df_6h.columns) else pef_curr

        # PEF slope over 6h (L/min per hour)
        pef_slope = 0.0
        if len(df_6h) >= 2 and "peak_flow_pef_l_min" in df_6h.columns:
            try:
                y = df_6h["peak_flow_pef_l_min"].dropna().values
                x = np.arange(len(y))
                if len(y) >= 2 and np.std(x) > 0:
                    pef_slope = float(np.polyfit(x, y, 1)[0])
            except Exception:
                pef_slope = 0.0

        # Respiratory rate
        rr_curr = float(current_obs.get("respiratory_rate_bpm", 16.0))
        rr_6h_mean = float(df_6h["respiratory_rate_bpm"].mean()) if (not df_6h.empty and "respiratory_rate_bpm" in df_6h.columns) else rr_curr
        rr_6h_delta = rr_curr - rr_6h_mean

        # SpO2 & Heart Rate
        spo2_curr = float(current_obs.get("spo2_pct", 98.0))
        spo2_6h_min = float(df_6h["spo2_pct"].min()) if (not df_6h.empty and "spo2_pct" in df_6h.columns) else spo2_curr
        hr_curr = float(current_obs.get("heart_rate_bpm", 72.0))
        hr_6h_mean = float(df_6h["heart_rate_bpm"].mean()) if (not df_6h.empty and "heart_rate_bpm" in df_6h.columns) else hr_curr
        exercise = float(current_obs.get("exercise_flag", 0))

        # Symptoms
        sym_curr = float(current_obs.get("symptom_severity", current_obs.get("symptom_severity_0_3", 0)))
        sym_col = "symptom_severity" if "symptom_severity" in df_6h.columns else ("symptom_severity_0_3" if "symptom_severity_0_3" in df_6h.columns else None)
        sym_6h_max = float(df_6h[sym_col].max()) if (sym_col and not df_6h.empty) else sym_curr
        wheeze_6h = float(df_6h["wheezing"].sum()) if (not df_6h.empty and "wheezing" in df_6h.columns) else float(current_obs.get("wheezing", 0))
        cough_6h = float(df_6h["coughing"].sum()) if (not df_6h.empty and "coughing" in df_6h.columns) else float(current_obs.get("coughing", 0))
        sob_6h = float(df_6h["shortness_of_breath"].sum()) if (not df_6h.empty and "shortness_of_breath" in df_6h.columns) else float(current_obs.get("shortness_of_breath", 0))
        tight_6h = float(df_6h["chest_tightness"].sum()) if (not df_6h.empty and "chest_tightness" in df_6h.columns) else float(current_obs.get("chest_tightness", 0))

        # Rescue Inhaler
        rescue_6h = float(df_6h["rescue_inhaler_uses"].sum()) if (not df_6h.empty and "rescue_inhaler_uses" in df_6h.columns) else float(current_obs.get("rescue_inhaler_uses", 0))
        rescue_24h = float(df_all["rescue_inhaler_uses"].sum()) if (not df_all.empty and "rescue_inhaler_uses" in df_all.columns) else rescue_6h

        # Environmental
        pm25_curr = float(current_obs.get("pm25_ug_m3", 15.0))
        pm25_3h = float(df_3h["pm25_ug_m3"].mean()) if (not df_3h.empty and "pm25_ug_m3" in df_3h.columns) else pm25_curr
        pm25_6h = float(df_6h["pm25_ug_m3"].mean()) if (not df_6h.empty and "pm25_ug_m3" in df_6h.columns) else pm25_curr

        pm10_curr = float(current_obs.get("pm10_ug_m3", 30.0))
        pm10_3h = float(df_3h["pm10_ug_m3"].mean()) if (not df_3h.empty and "pm10_ug_m3" in df_3h.columns) else pm10_curr

        pollen_curr = float(current_obs.get("pollen_level", current_obs.get("pollen_level_0_10", 2.0)))
        pollen_col = "pollen_level" if "pollen_level" in df_3h.columns else ("pollen_level_0_10" if "pollen_level_0_10" in df_3h.columns else None)
        pollen_3h = float(df_3h[pollen_col].mean()) if (pollen_col and not df_3h.empty) else pollen_curr

        dust_curr = float(current_obs.get("dust_exposure_level", 0))
        temp_curr = float(current_obs.get("temperature_c", 22.0))
        hum_curr = float(current_obs.get("humidity_pct", 50.0))

        # Derived interactions
        pm25_pollen = pm25_curr * (pollen_curr / 10.0)
        dust_exercise = dust_curr * exercise

        features: Dict[str, float] = {
            "pef_current": pef_curr,
            "pef_pct_of_reference": pef_pct,
            "pef_6h_min": pef_6h_min,
            "pef_6h_mean": pef_6h_mean,
            "pef_6h_slope": pef_slope,
            "respiratory_rate_current": rr_curr,
            "respiratory_rate_6h_mean": rr_6h_mean,
            "respiratory_rate_6h_delta": rr_6h_delta,
            "spo2_current": spo2_curr,
            "spo2_6h_min": spo2_6h_min,
            "heart_rate_current": hr_curr,
            "heart_rate_6h_mean": hr_6h_mean,
            "exercise_flag": exercise,
            "symptom_severity_current": sym_curr,
            "symptom_severity_6h_max": sym_6h_max,
            "wheezing_6h_sum": wheeze_6h,
            "coughing_6h_sum": cough_6h,
            "shortness_of_breath_6h_sum": sob_6h,
            "chest_tightness_6h_sum": tight_6h,
            "rescue_inhaler_6h_sum": rescue_6h,
            "rescue_inhaler_24h_sum": rescue_24h,
            "pm25_current": pm25_curr,
            "pm25_3h_mean": pm25_3h,
            "pm25_6h_mean": pm25_6h,
            "pm10_current": pm10_curr,
            "pm10_3h_mean": pm10_3h,
            "pollen_level_current": pollen_curr,
            "pollen_3h_mean": pollen_3h,
            "dust_exposure_level": dust_curr,
            "temperature_c": temp_curr,
            "humidity_pct": hum_curr,
            "pm25_pollen_interaction": pm25_pollen,
            "dust_exercise_interaction": dust_exercise,
            "patient_age": float(patient_age if patient_age is not None else 35.0),
            "historical_emergency_count": float(historical_emergency_count),
            "documented_allergy_count": float(documented_allergy_count),
        }
        return features

    @staticmethod
    def to_feature_vector(features_dict: Dict[str, float]) -> np.ndarray:
        return np.array([features_dict.get(fname, 0.0) for fname in FEATURE_NAMES], dtype=np.float32)
