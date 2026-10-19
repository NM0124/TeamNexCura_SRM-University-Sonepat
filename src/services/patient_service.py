"""
Patient Service Coordinator.
Bridges patient registry, EHR ingestion, database repositories, and state synchronization.
"""

from typing import List, Dict, Any, Optional
from pathlib import Path

from config.settings import settings
from src.digital_twin.patient_registry import PatientRegistry
from src.digital_twin.patient_twin import PatientTwin
from src.ingestion.synthea_importer import SyntheaImporter
from src.ingestion.schema_normalizer import NormalizedEHRProfile
from src.storage.database import get_db_session
from src.storage.repositories import ObservationRepository, PredictionRepository, AlertRepository, TimelineRepository


class PatientService:
    def __init__(self, registry: Optional[PatientRegistry] = None):
        self.registry = registry or PatientRegistry()
        self.synthea_importer = SyntheaImporter(settings.synthea_dir)
        self.sim_manager: Optional[Any] = None

    def load_synthea_cohort(self) -> Dict[str, Any]:
        """Loads and syncs Synthea synthetic patients into registry and initializes trajectories."""
        report = self.synthea_importer.scan_and_import()
        for pid, profile in self.synthea_importer.asthma_cohort.items():
            self.registry.register_patient(pid, profile)

        # Ensure PAT-001 through PAT-005 exist
        from src.simulation.multi_patient_manager import MultiPatientSimulationManager
        self.sim_manager = MultiPatientSimulationManager()

        # Seed initial observation for each registered twin so dashboard is immediately rich and interactive
        for pid in self.registry.list_patient_ids():
            twin = self.registry.get_twin(pid)
            if twin and len(twin.observations) == 0:
                # Prime with initial 16 observations to establish baseline, trigger correlations & initial state
                self.sim_manager.step_patient(twin, steps=16)

        return report

    def get_patient_twin(self, patient_id: str) -> Optional[PatientTwin]:
        return self.registry.get_twin(patient_id)

    def get_all_patient_ids(self) -> List[str]:
        return self.registry.list_patient_ids()

    def get_overview_data(self) -> List[Dict[str, Any]]:
        """Provides summary metrics across all active patient digital twins."""
        rows = []
        for twin in self.registry.list_all_twins():
            curr = twin.current_observation
            last_t = str(curr.get("timestamp")) if curr else "Awaiting Data"
            pef = curr.get("peak_flow_pef_l_min") if curr else None
            spo2 = curr.get("spo2_pct") if curr else None
            rr = curr.get("respiratory_rate_bpm") if curr else None
            hr = curr.get("heart_rate_bpm") or curr.get("pulse_rate_bpm") if curr else None
            severity = curr.get("symptom_severity_0_3", curr.get("symptom_severity", 0)) if curr else 0

            latest_pred = twin.latest_prediction
            risk_cat = latest_pred.get("risk_category", "none") if latest_pred else "unassessed"
            risk_score = latest_pred.get("risk_score") if latest_pred else None

            unack_alerts = [a for a in twin.active_alerts if not a.get("acknowledged", False)]

            has_ehr = (twin.ehr_profile is not None)
            diagnosis_str = "Documented Asthma" if (has_ehr and twin.ehr_profile.asthma_history.has_asthma_diagnosis) else "Illustrative/Demo"

            age = twin.ehr_profile.demographics.age if (has_ehr and twin.ehr_profile.demographics.age) else 28
            gender = twin.ehr_profile.demographics.gender if has_ehr else "female"

            rows.append({
                "patient_id": twin.patient_id,
                "age": age,
                "gender": gender,
                "asthma_status": diagnosis_str,
                "latest_observation_time": last_t,
                "current_pef": f"{pef} L/min" if pef else "N/A",
                "current_fev1": f"{curr.get('fev1_l', 'N/A')} L" if curr else "N/A",
                "current_spo2": f"{spo2}%" if spo2 else "N/A",
                "current_rr": f"{rr} /min" if rr else "N/A",
                "current_hr": f"{hr} bpm" if hr else "N/A",
                "symptom_severity": f"{severity}/3" if curr else "N/A",
                "risk_status": risk_cat.upper(),
                "risk_score": f"{risk_score:.2f}" if risk_score is not None else "N/A",
                "risk_pct": f"{int(risk_score * 100)}%" if risk_score is not None else "N/A",
                "active_alerts_count": len(unack_alerts),
                "data_quality": twin.quality_assessment.status,
                "total_observations": len(twin.observations)
            })
        return rows

