"""
Environmental Intelligence Service for Indian Urban Settings.
Provides localized air quality baselines, diurnal exposure patterns,
and synchronized Exposure-to-Deterioration timeline construction.
Supports offline operation with configurable urban presets (Bengaluru, Delhi, Mumbai, Kolkata, Hyderabad).
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import numpy as np


class IndianUrbanEnvironmentalService:
    CITY_PRESETS = {
        "Bengaluru, KA": {
            "city": "Bengaluru",
            "state": "Karnataka",
            "climate": "Tropical savanna / Elevated plateau",
            "baseline_pm25": 45.0,
            "peak_pm25": 85.0,
            "baseline_pm10": 80.0,
            "typical_pollen": "High (Parthenium & Eucalyptus)",
            "monsoon_months": ["June", "July", "August", "September"],
            "winter_inversion_risk": "Low to Moderate",
            "primary_sources": ["Vehicular transit", "Construction dust", "Pollen seasonal peaks"]
        },
        "Delhi NCR": {
            "city": "Delhi NCR",
            "state": "Delhi",
            "climate": "Semi-arid / Extreme seasonal continental",
            "baseline_pm25": 110.0,
            "peak_pm25": 280.0,
            "baseline_pm10": 210.0,
            "typical_pollen": "Moderate",
            "monsoon_months": ["July", "August"],
            "winter_inversion_risk": "Severe (Stubble burning & Winter fog entrapment)",
            "primary_sources": ["Biomass burning", "Thermal power emissions", "Vehicular smog"]
        },
        "Mumbai, MH": {
            "city": "Mumbai",
            "state": "Maharashtra",
            "climate": "Tropical wet and dry / Coastal high humidity",
            "baseline_pm25": 42.0,
            "peak_pm25": 75.0,
            "baseline_pm10": 70.0,
            "typical_pollen": "Low to Moderate",
            "monsoon_months": ["June", "July", "August", "September"],
            "winter_inversion_risk": "Moderate coastal stagnation",
            "primary_sources": ["Marine salt spray", "Vehicular emissions", "Construction dust"]
        },
        "Kolkata, WB": {
            "city": "Kolkata",
            "state": "West Bengal",
            "climate": "Tropical wet and dry / Gangetic plain",
            "baseline_pm25": 78.0,
            "peak_pm25": 160.0,
            "baseline_pm10": 135.0,
            "typical_pollen": "Moderate",
            "monsoon_months": ["June", "July", "August", "September"],
            "winter_inversion_risk": "High nocturnal winter inversion",
            "primary_sources": ["Industrial activity", "Solid fuel combustion", "Traffic congestion"]
        },
        "Hyderabad, TS": {
            "city": "Hyderabad",
            "state": "Telangana",
            "climate": "Semi-arid plateau",
            "baseline_pm25": 48.0,
            "peak_pm25": 92.0,
            "baseline_pm10": 90.0,
            "typical_pollen": "Moderate",
            "monsoon_months": ["June", "July", "August", "September"],
            "winter_inversion_risk": "Moderate",
            "primary_sources": ["Urban dust", "Vehicular corridors", "Industrial suburbs"]
        }
    }

    PATIENT_CITY_MAP = {
        "PAT-001": "Bengaluru, KA",
        "PAT-002": "Delhi NCR",
        "PAT-003": "Mumbai, MH",
        "PAT-004": "Kolkata, WB",
        "PAT-005": "Hyderabad, TS",
        "CSV_PATIENT_001": "Bengaluru, KA"
    }

    @classmethod
    def get_patient_city(cls, patient_id: str) -> str:
        return cls.PATIENT_CITY_MAP.get(patient_id, "Bengaluru, KA")

    @classmethod
    def get_city_profile(cls, city_key: str) -> Dict[str, Any]:
        return cls.CITY_PRESETS.get(city_key, cls.CITY_PRESETS["Bengaluru, KA"])

    @classmethod
    def build_exposure_timeline(
        cls,
        observations: List[Dict[str, Any]],
        predictions: List[Dict[str, Any]],
        pef_reference: float = 450.0
    ) -> List[Dict[str, Any]]:
        """
        Creates synchronized chronological timeline items matching environmental exposure
        spikes to subsequent respiratory reactions with elapsed time.
        """
        events = []
        if not observations:
            return events

        # Sort observations chronologically
        sorted_obs = sorted(
            observations,
            key=lambda x: datetime.fromisoformat(x["timestamp"]) if isinstance(x["timestamp"], str) else x["timestamp"]
        )

        pef_thresh = pef_reference * 0.80

        for i, obs in enumerate(sorted_obs):
            t_curr = obs["timestamp"]
            pm25 = obs.get("pm25_ug_m3", 0.0)
            pm10 = obs.get("pm10_ug_m3", 0.0)
            pef = obs.get("peak_flow_pef_l_min")
            rr = obs.get("respiratory_rate_bpm")
            wheeze = obs.get("wheezing", 0)
            inhaler = obs.get("rescue_inhaler_uses", 0)
            spo2 = obs.get("spo2_pct", 98.0)

            # High PM2.5 spike event
            if pm25 > 75.0:
                events.append({
                    "timestamp": t_curr,
                    "event_type": "environmental_exposure",
                    "severity": "high" if pm25 > 100.0 else "moderate",
                    "badge": "PM2.5 Exposure Spike",
                    "value_display": f"{pm25:.1f} µg/m³",
                    "description": f"Elevated particulate concentration detected (PM2.5: {pm25:.1f} µg/m³, PM10: {pm10:.1f} µg/m³). Potential respiratory irritation trigger."
                })

            # Significant PEF decline event
            if pef is not None and pef < pef_thresh:
                pct_loss = int(round((1.0 - pef / pef_reference) * 100.0))
                # Search backward for the most recent exposure within past 4 hours
                prev_exposure_time = None
                curr_dt = datetime.fromisoformat(t_curr) if isinstance(t_curr, str) else t_curr
                for prev_obs in sorted_obs[max(0, i - 12):i]:
                    prev_dt = datetime.fromisoformat(prev_obs["timestamp"]) if isinstance(prev_obs["timestamp"], str) else prev_obs["timestamp"]
                    if prev_obs.get("pm25_ug_m3", 0.0) > 70.0:
                        prev_exposure_time = prev_dt

                elapsed_note = ""
                if prev_exposure_time:
                    elapsed_mins = int((curr_dt - prev_exposure_time).total_seconds() / 60)
                    elapsed_note = f" Occurred {elapsed_mins} minutes after recorded PM2.5 spike."

                events.append({
                    "timestamp": t_curr,
                    "event_type": "respiratory_deterioration",
                    "severity": "critical" if pef < pef_reference * 0.70 else "warning",
                    "badge": "PEF Decline Below 80%",
                    "value_display": f"{pef} L/min (-{pct_loss}%)",
                    "description": f"Peak flow dropped to {pef} L/min ({pct_loss}% below personal best {int(pef_reference)} L/min).{elapsed_note}"
                })

            # Rescue inhaler use event
            if inhaler and inhaler > 0:
                events.append({
                    "timestamp": t_curr,
                    "event_type": "medication_rescue",
                    "severity": "info",
                    "badge": "Rescue Inhaler Actuation",
                    "value_display": f"{inhaler} puff(s)",
                    "description": f"Patient self-administered {inhaler} puff(s) of short-acting beta-agonist (SABA/Albuterol)."
                })

            # SpO2 desaturation warning
            if spo2 is not None and spo2 < 93.0:
                events.append({
                    "timestamp": t_curr,
                    "event_type": "oximeter_desaturation",
                    "severity": "warning",
                    "badge": "SpO2 Desaturation",
                    "value_display": f"{spo2:.1f}%",
                    "description": f"Peripheral oxygen saturation dipped to {spo2:.1f}%. Respiration rate at {rr} bpm."
                })

        # Append prediction milestones
        for pred in predictions:
            pred_time = pred.get("prediction_timestamp") or pred.get("observation_cutoff_time")
            score = pred.get("risk_score")
            cat = pred.get("risk_category", "low")
            if score is not None and cat in ["high", "moderate"]:
                events.append({
                    "timestamp": pred_time,
                    "event_type": "model_prediction",
                    "severity": "warning" if cat == "high" else "info",
                    "badge": f"Forecast: {cat.upper()} RISK ({int(score * 100)}%)",
                    "value_display": f"{int(score * 100)}% 2h Risk",
                    "description": f"Digital Twin forecast generated: {int(score * 100)}% probability of deterioration within 2 hours. Driver: {pred.get('explanation', 'Feature updates')}"
                })

        # Sort all timeline items chronologically descending (newest first)
        events.sort(
            key=lambda x: datetime.fromisoformat(str(x["timestamp"]).replace("Z", "+00:00")) if isinstance(x["timestamp"], (str, datetime)) else datetime.utcnow(),
            reverse=True
        )

        return events[:50]
