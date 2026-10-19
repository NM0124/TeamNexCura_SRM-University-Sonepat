"""
Configurable Multi-Patient Synthetic Longitudinal Trajectory Generator.
Generates reproducible synthetic virtual patients with distinct physiological baselines,
environmental exposure responses, diurnal rhythms, and episodic deterioration events.
Exports dataset and reproducibility metadata JSON.
"""

from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import json
import numpy as np
import pandas as pd

from config.settings import settings, GENERATED_DATA_DIR


class SyntheticPatientGenerator:
    def __init__(
        self,
        n_patients: int = 5,
        duration_days: int = 14,
        interval_hours: int = 1,
        random_seed: int = 42,
        missing_rate: float = 0.02,
        patient_ids: Optional[List[str]] = None,
        interval_minutes: Optional[int] = None
    ):
        self.n_patients = n_patients
        self.duration_days = duration_days
        self.interval_hours = interval_hours
        self.interval_minutes = interval_minutes or (interval_hours * 60)
        self.random_seed = random_seed
        self.missing_rate = missing_rate
        self.patient_ids = patient_ids
        self.rng = np.random.RandomState(random_seed)

    def generate_cohort(self) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """Generates multi-patient longitudinal dataframe and reproducibility metadata."""
        all_records: List[Dict[str, Any]] = []
        patient_profiles: Dict[str, Dict[str, Any]] = {}

        total_steps = (self.duration_days * 24 * 60) // self.interval_minutes
        start_time = datetime(2026, 10, 1, 0, 0, 0)

        for p_idx in range(1, self.n_patients + 1):
            if self.patient_ids and p_idx - 1 < len(self.patient_ids):
                pid = self.patient_ids[p_idx - 1]
            else:
                pid = f"SYNTH_PAT_{p_idx:03d}"

            # Distinct patient-specific phenotypes
            base_pef = self.rng.normal(420, 45)  # 350 - 500 L/min
            base_hr = self.rng.normal(72, 6)
            base_rr = self.rng.normal(15, 2)
            base_spo2 = self.rng.normal(98.2, 0.5)
            pm25_sensitivity = self.rng.uniform(0.5, 2.0)  # sensitivity multiplier
            pollen_sensitivity = self.rng.uniform(0.3, 2.5)

            patient_profiles[pid] = {
                "patient_id": pid,
                "baseline_pef": round(float(base_pef), 1),
                "baseline_hr": round(float(base_hr), 1),
                "baseline_rr": round(float(base_rr), 1),
                "baseline_spo2": round(float(base_spo2), 1),
                "pm25_sensitivity": round(float(pm25_sensitivity), 2),
                "pollen_sensitivity": round(float(pollen_sensitivity), 2),
            }

            # Generate deterioration event windows for this patient (e.g. 1-2 events over 14 days)
            event_starts = set()
            if self.rng.rand() < 0.8:
                ev1 = self.rng.randint(24, max(25, total_steps - 24))
                for step_offset in range(ev1, min(total_steps, ev1 + max(4, int(8 * 60 / self.interval_minutes)))):
                    event_starts.add(step_offset)

            for step in range(total_steps):
                curr_time = start_time + timedelta(minutes=step * self.interval_minutes)
                hour = curr_time.hour

                # Diurnal environmental patterns
                diurnal_temp = 22.0 + 6.0 * np.sin((hour - 8) * np.pi / 12) + self.rng.normal(0, 1.0)
                diurnal_hum = 65.0 - 15.0 * np.sin((hour - 8) * np.pi / 12) + self.rng.normal(0, 2.0)
                pm25 = max(5.0, 18.0 + 8.0 * np.sin((hour - 7) * np.pi / 12) + self.rng.exponential(6.0))
                pm10 = pm25 * self.rng.uniform(1.6, 2.4)
                pollen = max(0.0, min(10.0, 3.0 + 2.5 * np.sin((hour - 12) * np.pi / 12) + self.rng.normal(0, 0.8)))
                dust = int(self.rng.choice([0, 1, 2], p=[0.75, 0.20, 0.05]))

                # Exercise flag (more likely early morning / evening)
                exercise = 1 if (hour in [7, 18] and self.rng.rand() < 0.4) else 0

                # Deterioration event check
                is_deteriorating = step in event_starts
                if is_deteriorating:
                    # Deterioration episode
                    pef_drop_pct = self.rng.uniform(0.20, 0.35)
                    pef = base_pef * (1.0 - pef_drop_pct) + self.rng.normal(0, 8.0)
                    spo2 = max(89.0, base_spo2 - self.rng.uniform(2.5, 5.0))
                    rr = base_rr + self.rng.uniform(4.0, 8.0)
                    hr = base_hr + self.rng.uniform(12.0, 25.0)
                    wheeze = 1 if self.rng.rand() < 0.75 else 0
                    cough = 1 if self.rng.rand() < 0.85 else 0
                    sob = 1 if self.rng.rand() < 0.70 else 0
                    chest = 1 if self.rng.rand() < 0.60 else 0
                    severity = int(self.rng.choice([2, 3], p=[0.4, 0.6]))
                    inhaler = int(self.rng.choice([1, 2], p=[0.5, 0.5]))
                    risk_label = "high"
                else:
                    # Normal / mild fluctuations
                    env_stress = (pm25 / 50.0) * pm25_sensitivity + (pollen / 10.0) * pollen_sensitivity
                    pef = base_pef * (1.0 - 0.04 * env_stress) + (10.0 if exercise else 0.0) + self.rng.normal(0, 10.0)
                    spo2 = min(100.0, base_spo2 + self.rng.normal(0, 0.4))
                    rr = base_rr + (2.0 if exercise else 0.0) + self.rng.normal(0, 1.0)
                    hr = base_hr + (15.0 if exercise else 0.0) + self.rng.normal(0, 3.0)
                    wheeze = 1 if (env_stress > 1.2 and self.rng.rand() < 0.2) else 0
                    cough = 1 if (env_stress > 1.0 and self.rng.rand() < 0.25) else 0
                    sob = 1 if (exercise and self.rng.rand() < 0.2) else 0
                    chest = 0
                    severity = 1 if (wheeze or cough) else 0
                    inhaler = 1 if (wheeze and self.rng.rand() < 0.3) else 0
                    risk_label = "moderate" if env_stress > 1.2 else "low"

                # Additional realistic wearable & oximeter parameters
                pulse_rate = int(np.clip(hr + self.rng.normal(0, 1.0), 45, 180))
                resting_hr = int(np.clip(base_hr, 50, 95))
                step_cnt = int(self.rng.randint(400, 1800) if exercise else (self.rng.randint(50, 350) if 7 <= hour <= 21 else 0))
                sleep_hrs = round(float(self.rng.uniform(6.0, 8.2) if not is_deteriorating else self.rng.uniform(4.5, 6.0)), 1)
                sleep_interruptions = int(self.rng.choice([2, 3, 4], p=[0.3, 0.4, 0.3]) if is_deteriorating else self.rng.choice([0, 1], p=[0.8, 0.2]))
                hrv = round(float(self.rng.normal(48, 8) if not is_deteriorating else self.rng.normal(32, 5)), 1)
                fev1 = round(float(np.clip(pef * 0.0068, 0.9, 5.0)), 2)

                rec = {
                    "patient_id": pid,
                    "timestamp": curr_time.strftime("%Y-%m-%d %H:%M:%S"),
                    "pm25_ug_m3": round(float(pm25), 1),
                    "pm10_ug_m3": round(float(pm10), 1),
                    "temperature_c": round(float(diurnal_temp), 1),
                    "humidity_pct": round(float(diurnal_hum), 1),
                    "pollen_level_0_10": round(float(pollen), 1),
                    "dust_exposure_level": dust,
                    "exercise_flag": exercise,
                    "wheezing": wheeze,
                    "coughing": cough,
                    "shortness_of_breath": sob,
                    "chest_tightness": chest,
                    "symptom_severity_0_3": severity,
                    "heart_rate_bpm": int(np.clip(hr, 45, 180)),
                    "pulse_rate_bpm": pulse_rate,
                    "resting_heart_rate_bpm": resting_hr,
                    "respiratory_rate_bpm": int(np.clip(rr, 8, 40)),
                    "spo2_pct": round(float(np.clip(spo2, 85.0, 100.0)), 1),
                    "peak_flow_pef_l_min": int(np.clip(pef, 100, 800)),
                    "fev1_l": fev1,
                    "rescue_inhaler_uses": inhaler,
                    "step_count": step_cnt,
                    "sleep_duration_hours": sleep_hrs,
                    "sleep_interruptions": sleep_interruptions,
                    "hrv_ms": hrv,
                    "signal_quality": "optimal" if self.rng.rand() > 0.05 else "acceptable",
                    "device_connection_status": "connected",
                    "oximeter_source": "Simulated BLE Pulse Oximeter [Mode A]",
                    "synthetic_flareup_risk": risk_label,
                    "data_source": "synthetic_generator_v2"
                }

                # Introduce realistic occasional missing data
                if self.rng.rand() < self.missing_rate:
                    field_to_drop = self.rng.choice(["peak_flow_pef_l_min", "spo2_pct", "pm25_ug_m3"])
                    rec[field_to_drop] = np.nan

                all_records.append(rec)


        df = pd.DataFrame(all_records)

        metadata = {
            "generator_version": "1.0.0",
            "generation_timestamp": datetime.utcnow().isoformat(),
            "random_seed": self.random_seed,
            "patient_count": self.n_patients,
            "duration_days": self.duration_days,
            "interval_hours": self.interval_hours,
            "total_observations": len(df),
            "missing_data_rate": self.missing_rate,
            "patient_profiles": patient_profiles,
            "clinical_disclaimer": (
                "Synthetic trajectories are for software simulation and algorithmic testing only. "
                "They do not reproduce authentic human in-vivo asthma pathophysiology."
            )
        }

        return df, metadata

    def save_generated_dataset(self, output_dir: Optional[Path] = None) -> Tuple[Path, Path]:
        """Generates, validates, and exports CSV and metadata JSON."""
        target_dir = output_dir or GENERATED_DATA_DIR
        target_dir.mkdir(parents=True, exist_ok=True)

        df, meta = self.generate_cohort()
        csv_path = target_dir / "multi_patient_synthetic_cohort.csv"
        meta_path = target_dir / "multi_patient_cohort_metadata.json"

        df.to_csv(csv_path, index=False)
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)

        return csv_path, meta_path
