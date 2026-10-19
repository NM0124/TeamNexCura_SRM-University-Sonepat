"""
Patient Registry and Isolation Manager.
Maintains independent virtual representations for all monitored patients.
Ensures observation arrivals for one patient never bleed into another patient's baseline or predictions.
"""

from typing import Dict, List, Optional
from src.digital_twin.patient_twin import PatientTwin
from src.ingestion.schema_normalizer import NormalizedEHRProfile
from src.ingestion.synthea_importer import SyntheaImporter


class PatientRegistry:
    def __init__(self):
        self._twins: Dict[str, PatientTwin] = {}
        # Pre-register default CSV replay patient
        default_ehr = SyntheaImporter.create_illustrative_demo_profile("CSV_PATIENT_001")
        self.register_patient("CSV_PATIENT_001", default_ehr)

    def register_patient(self, patient_id: str, ehr_profile: Optional[NormalizedEHRProfile] = None) -> PatientTwin:
        if patient_id not in self._twins:
            self._twins[patient_id] = PatientTwin(patient_id=patient_id, ehr_profile=ehr_profile)
        elif ehr_profile and not self._twins[patient_id].ehr_profile:
            self._twins[patient_id].ehr_profile = ehr_profile
        return self._twins[patient_id]

    def get_twin(self, patient_id: str) -> Optional[PatientTwin]:
        return self._twins.get(patient_id)

    def get_or_create(self, patient_id: str, ehr_profile: Optional[NormalizedEHRProfile] = None) -> PatientTwin:
        if patient_id not in self._twins:
            return self.register_patient(patient_id, ehr_profile)
        return self._twins[patient_id]

    def list_patient_ids(self) -> List[str]:
        return list(self._twins.keys())

    def list_all_twins(self) -> List[PatientTwin]:
        return list(self._twins.values())

    def patient_count(self) -> int:
        return len(self._twins)

    def reset_all(self):
        for twin in self._twins.values():
            twin.reset_state()
