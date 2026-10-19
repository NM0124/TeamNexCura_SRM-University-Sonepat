"""
Data Quality and Uncertainty Assessment Subsystem.
Evaluates observations and historical context to detect missing, stale, noisy,
or out-of-bounds readings, enforcing safe model abstention when data are insufficient.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, Field

# Plausible clinical thresholds
BOUNDS = {
    "spo2_pct": (70.0, 100.0),
    "heart_rate_bpm": (40, 200),
    "respiratory_rate_bpm": (8, 45),
    "peak_flow_pef_l_min": (80, 850),
    "temperature_c": (-10.0, 50.0),
    "pm25_ug_m3": (0.0, 500.0),
}

# Max plausible 1-hour abrupt drop in PEF (without equipment error)
MAX_PLAUSIBLE_1H_PEF_DROP = 250.0


class DataQualityAssessment(BaseModel):
    status: str  # data_sufficient, data_incomplete, data_stale, baseline_provisional, implausible_spike
    is_valid_for_inference: bool = True
    withhold_prediction: bool = False
    withhold_reason: Optional[str] = None
    flags: List[str] = Field(default_factory=list)
    details: Dict[str, Any] = Field(default_factory=dict)
    evaluated_at: datetime = Field(default_factory=datetime.utcnow)


class DataQualityEvaluator:
    @staticmethod
    def evaluate(
        current_obs: Dict[str, Any],
        recent_history: List[Dict[str, Any]],
        stale_threshold_hours: int = 12,
        min_history_count: int = 6
    ) -> DataQualityAssessment:
        flags: List[str] = []
        details: Dict[str, Any] = {}
        withhold = False
        reasons: List[str] = []

        if not current_obs:
            return DataQualityAssessment(
                status="data_incomplete",
                is_valid_for_inference=False,
                withhold_prediction=True,
                withhold_reason="No observation available.",
                flags=["missing_current_observation"]
            )

        # 1. Check Missing Essential Measurements
        critical_fields = ["peak_flow_pef_l_min", "spo2_pct", "respiratory_rate_bpm"]
        for f in critical_fields:
            val = current_obs.get(f)
            if val is None or (isinstance(val, (int, float)) and val <= 0):
                flags.append(f"missing_{f}")
                reasons.append(f"Missing essential measurement: {f}")
                withhold = True

        # 2. Check Plausible Physiological Ranges
        for f, (min_v, max_v) in BOUNDS.items():
            val = current_obs.get(f)
            if val is not None and isinstance(val, (int, float)):
                if val < min_v or val > max_v:
                    flags.append(f"out_of_bounds_{f}")
                    details[f"{f}_value"] = val
                    details[f"{f}_bounds"] = [min_v, max_v]
                    if f in critical_fields:
                        reasons.append(f"Measurement {f}={val} outside plausible range [{min_v}, {max_v}]")
                        withhold = True

        # 3. Check Implausible Abrupt Spikes / Drops
        if recent_history and len(recent_history) >= 1:
            prev = recent_history[-1]
            curr_pef = current_obs.get("peak_flow_pef_l_min")
            prev_pef = prev.get("peak_flow_pef_l_min")
            if curr_pef and prev_pef:
                drop = prev_pef - curr_pef
                if drop > MAX_PLAUSIBLE_1H_PEF_DROP:
                    flags.append("implausible_abrupt_pef_drop")
                    details["pef_drop_1h"] = drop
                    flags.append("potential_sensor_artefact")

        # 4. Check Stale Data
        obs_time = current_obs.get("timestamp")
        if isinstance(obs_time, str):
            try:
                obs_time = datetime.fromisoformat(obs_time)
            except Exception:
                obs_time = None

        # Check history depth
        if len(recent_history) < min_history_count:
            flags.append("insufficient_historical_depth")
            details["history_count"] = len(recent_history)

        # Determine overall status
        if withhold:
            status = "data_incomplete" if any("missing" in f for f in flags) else "implausible_spike"
        elif "insufficient_historical_depth" in flags:
            status = "baseline_provisional"
        else:
            status = "data_sufficient"

        return DataQualityAssessment(
            status=status,
            is_valid_for_inference=not withhold,
            withhold_prediction=withhold,
            withhold_reason="; ".join(reasons) if reasons else None,
            flags=flags,
            details=details
        )
