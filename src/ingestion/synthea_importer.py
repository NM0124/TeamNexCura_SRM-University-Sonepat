"""
Synthea FHIR Cohort Importer and Manager.
Discovers, imports, and indexes synthetic EHR records, identifying patients with documented asthma.
Handles absent files gracefully without crashing the application.
"""

from pathlib import Path
from typing import List, Dict, Any, Optional
import json
import logging

from src.ingestion.fhir_parser import FHIRParser
from src.ingestion.schema_normalizer import (
    NormalizedEHRProfile,
    PatientDemographics,
    AsthmaHistory,
    EncounterSummary,
    MedicationRecord,
    AllergyRecord,
)

logger = logging.getLogger(__name__)


class SyntheaImporter:
    def __init__(self, synthea_dir: Path):
        self.synthea_dir = Path(synthea_dir)
        self.all_profiles: Dict[str, NormalizedEHRProfile] = {}
        self.asthma_cohort: Dict[str, NormalizedEHRProfile] = {}
        self.import_report: Dict[str, Any] = {}

    def scan_and_import(self) -> Dict[str, Any]:
        """Scans the configured directory for Synthea JSON bundles and normalizes them."""
        self.all_profiles.clear()
        self.asthma_cohort.clear()

        report = {
            "directory": str(self.synthea_dir),
            "directory_exists": self.synthea_dir.exists(),
            "json_files_found": 0,
            "total_patients_imported": 0,
            "asthma_patients_count": 0,
            "non_asthma_patients_count": 0,
            "status": "ready",
            "message": "",
        }

        if not self.synthea_dir.exists():
            report["status"] = "missing_directory"
            report["message"] = f"Synthea directory not found at: {self.synthea_dir}. Historical EHR awaiting import."
            self.import_report = report
            return report

        json_files = list(self.synthea_dir.glob("*.json"))
        report["json_files_found"] = len(json_files)

        if len(json_files) == 0:
            report["status"] = "awaiting_data"
            report["message"] = f"Directory {self.synthea_dir} contains no JSON files. Run Synthea or generate sample records."
            self.import_report = report
            return report

        for file_path in json_files:
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)

                if data.get("resourceType") == "Bundle":
                    profile = FHIRParser.parse_bundle(data)
                    self.all_profiles[profile.patient_id] = profile
                    if profile.asthma_history.has_asthma_diagnosis:
                        self.asthma_cohort[profile.patient_id] = profile
            except Exception as e:
                logger.warning(f"Error reading FHIR bundle {file_path.name}: {e}")

        report["total_patients_imported"] = len(self.all_profiles)
        report["asthma_patients_count"] = len(self.asthma_cohort)
        report["non_asthma_patients_count"] = len(self.all_profiles) - len(self.asthma_cohort)

        if len(self.asthma_cohort) == 0:
            report["status"] = "no_asthma_found"
            report["message"] = (
                f"Imported {len(self.all_profiles)} synthetic patient records, but none contained documented asthma "
                f"diagnoses matching SNOMED/ICD criteria."
            )
        else:
            report["status"] = "success"
            report["message"] = f"Successfully loaded {len(self.asthma_cohort)} asthma patients out of {len(self.all_profiles)} records."

        self.import_report = report
        return report

    def get_profile(self, patient_id: str) -> Optional[NormalizedEHRProfile]:
        return self.all_profiles.get(patient_id)

    def get_all_asthma_profiles(self) -> List[NormalizedEHRProfile]:
        return list(self.asthma_cohort.values())

    @staticmethod
    def create_illustrative_demo_profile(patient_id: str = "CSV_PATIENT_001") -> NormalizedEHRProfile:
        """
        Creates an explicitly labelled synthetic demo profile for the initial CSV replay patient.
        Never presents this as a clinically verified patient record.
        """
        return NormalizedEHRProfile(
            patient_id=patient_id,
            demographics=PatientDemographics(
                patient_id=patient_id,
                age=38,
                gender="female"
            ),
            asthma_history=AsthmaHistory(
                has_asthma_diagnosis=True,
                diagnosis_code="195967001",
                diagnosis_description="Moderate Persistent Asthma (Synthetic Demo Profile)",
                associated_conditions=["Allergic rhinitis", "Mild pollen allergy"],
                documented_exacerbation_count=1,
                emergency_visits_count=1,
                hospitalizations_count=0,
                clinical_personal_best_pef=480.0  # Documented reference personal best for demo
            ),
            encounters=[
                EncounterSummary(
                    id="ENC-001",
                    encounter_type="ambulatory",
                    reason_text="Routine Asthma Review & Spirometry"
                ),
                EncounterSummary(
                    id="ENC-002",
                    encounter_type="emergency",
                    reason_text="Acute Bronchospasm following High Pollen Exposure"
                )
            ],
            medications=[
                MedicationRecord(
                    id="MED-001",
                    name="Fluticasone propionate / Salmeterol 250/50 mcg Diskus",
                    code="310291",
                    status="active",
                    dosage_instruction="1 inhalation twice daily"
                ),
                MedicationRecord(
                    id="MED-002",
                    name="Albuterol 90mcg Inhalation Aerosol (Rescue)",
                    code="745679",
                    status="active",
                    dosage_instruction="1-2 puffs as needed for shortness of breath"
                )
            ],
            allergies=[
                AllergyRecord(
                    id="ALL-001",
                    substance="Birch and Grass Pollen",
                    criticality="high",
                    reaction="Bronchospasm and sneezing"
                ),
                AllergyRecord(
                    id="ALL-002",
                    substance="House Dust Mites",
                    criticality="low",
                    reaction="Mild nocturnal cough"
                )
            ],
            care_plans=[],
            historical_measurements=[],
            provenance_source="Synthetic Demonstration EHR",
            is_demo_profile=True
        )
