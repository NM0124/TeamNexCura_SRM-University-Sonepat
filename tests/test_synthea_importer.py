"""
Unit tests for Synthea FHIR Importer and Cohort Selection.
"""

from pathlib import Path
from src.ingestion.synthea_importer import SyntheaImporter
from src.ingestion.fhir_parser import FHIRParser
from config.settings import settings


def test_synthea_importer_on_samples():
    """Validates parser on sample Synthea FHIR files."""
    importer = SyntheaImporter(settings.synthea_dir)
    report = importer.scan_and_import()

    assert report["status"] == "success"
    assert report["total_patients_imported"] >= 2
    assert report["asthma_patients_count"] >= 1

    # Check asthma cohort filtering
    for pid, profile in importer.asthma_cohort.items():
        assert profile.asthma_history.has_asthma_diagnosis is True
        assert profile.demographics.gender in ["male", "female", "unknown"]


def test_missing_synthea_dir_handled_gracefully(tmp_path):
    """Verifies that an absent Synthea folder does not crash the app."""
    non_existent = tmp_path / "does_not_exist"
    importer = SyntheaImporter(non_existent)
    report = importer.scan_and_import()

    assert report["status"] == "missing_directory"
    assert "not found" in report["message"].lower()


def test_unrecorded_fields_are_not_invented():
    """Ensures parser assigns explicit 'Not recorded' or None rather than inventing data."""
    empty_bundle = {
        "resourceType": "Bundle",
        "entry": [
            {
                "resource": {
                    "resourceType": "Patient",
                    "id": "BARE_PATIENT_999"
                }
            }
        ]
    }
    profile = FHIRParser.parse_bundle(empty_bundle)
    assert profile.patient_id == "BARE_PATIENT_999"
    assert profile.asthma_history.has_asthma_diagnosis is False
    assert profile.asthma_history.clinical_personal_best_pef is None
    assert profile.demographics.age is None
    assert len(profile.encounters) == 0
    assert len(profile.medications) == 0
