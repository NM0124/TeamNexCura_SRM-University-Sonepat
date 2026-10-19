"""
Personalized Baseline Manager.
Calculates robust statistical baselines (median, MAD) from historical observations.
Never uses future observations. Clearly distinguishes rolling statistical baselines
from clinician-validated clinical personal bests.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from pydantic import BaseModel, Field


class BaselineState(BaseModel):
    patient_id: str
    calculated_at: datetime
    window_hours: int = 72
    observation_count: int = 0
    is_provisional: bool = True
    
    # Robust Statistics (Medians & MAD)
    median_pef: Optional[float] = None
    mad_pef: Optional[float] = None
    pef_reference_value: float = 400.0  # Clinical personal best if available, else median PEF
    reference_source: str = "default_population"  # clinician_documented, rolling_median, default_population
    
    median_spo2: Optional[float] = None
    median_respiratory_rate: Optional[float] = None
    median_heart_rate: Optional[float] = None
    typical_symptom_severity: float = 0.0
    baseline_rescue_inhaler_rate: float = 0.0


class BaselineManager:
    @staticmethod
    def calculate_baseline(
        patient_id: str,
        observations: List[Dict[str, Any]],
        current_time: datetime,
        window_hours: int = 72,
        min_stable_hours: int = 24,
        clinical_personal_best: Optional[float] = None
    ) -> BaselineState:
        """
        Calculates patient baseline using only past valid observations up to current_time.
        """
        # Filter strictly past observations within the time window
        cutoff_start = current_time - timedelta(hours=window_hours)
        valid_history = []
        for obs in observations:
            t = obs.get("timestamp")
            if isinstance(t, str):
                t = datetime.fromisoformat(t)
            if cutoff_start <= t <= current_time:
                # Exclude flagged invalid readings
                if obs.get("quality_status") != "implausible_measurement":
                    valid_history.append(obs)

        obs_count = len(valid_history)
        is_provisional = obs_count < min_stable_hours

        if obs_count == 0:
            # Fallback with explicit provisional flag
            ref_val = clinical_personal_best if clinical_personal_best else 400.0
            ref_source = "clinician_documented" if clinical_personal_best else "default_population"
            return BaselineState(
                patient_id=patient_id,
                calculated_at=current_time,
                window_hours=window_hours,
                observation_count=0,
                is_provisional=True,
                pef_reference_value=ref_val,
                reference_source=ref_source
            )

        df = pd.DataFrame(valid_history)

        def get_median_and_mad(series: pd.Series) -> tuple:
            s_clean = series.dropna()
            if len(s_clean) == 0:
                return None, None
            med = float(s_clean.median())
            mad = float(np.median(np.abs(s_clean - med)))
            return med, mad

        med_pef, mad_pef = get_median_and_mad(df["peak_flow_pef_l_min"]) if "peak_flow_pef_l_min" in df.columns else (None, None)
        med_spo2, _ = get_median_and_mad(df["spo2_pct"]) if "spo2_pct" in df.columns else (None, None)
        med_rr, _ = get_median_and_mad(df["respiratory_rate_bpm"]) if "respiratory_rate_bpm" in df.columns else (None, None)
        med_hr, _ = get_median_and_mad(df["heart_rate_bpm"]) if "heart_rate_bpm" in df.columns else (None, None)
        med_sym, _ = get_median_and_mad(df["symptom_severity"]) if "symptom_severity" in df.columns else (0.0, 0.0)
        med_inh, _ = get_median_and_mad(df["rescue_inhaler_uses"]) if "rescue_inhaler_uses" in df.columns else (0.0, 0.0)

        # Reference PEF determination
        if clinical_personal_best and clinical_personal_best > 0:
            pef_ref = float(clinical_personal_best)
            ref_source = "clinician_documented_personal_best"
        elif med_pef and med_pef > 0:
            pef_ref = med_pef
            ref_source = "rolling_median_baseline"
        else:
            pef_ref = 400.0
            ref_source = "default_population"

        return BaselineState(
            patient_id=patient_id,
            calculated_at=current_time,
            window_hours=window_hours,
            observation_count=obs_count,
            is_provisional=is_provisional,
            median_pef=med_pef,
            mad_pef=mad_pef,
            pef_reference_value=pef_ref,
            reference_source=ref_source,
            median_spo2=med_spo2,
            median_respiratory_rate=med_rr,
            median_heart_rate=med_hr,
            typical_symptom_severity=med_sym or 0.0,
            baseline_rescue_inhaler_rate=med_inh or 0.0
        )
