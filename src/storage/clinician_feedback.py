"""
Clinician Review & Feedback Repository.
Stores physician feedback separately from ground-truth predictions and raw telemetry.
Maintains clinical audit trail without automatic unscheduled retraining.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
import json
from pathlib import Path
from pydantic import BaseModel, Field


class ClinicianFeedbackRecord(BaseModel):
    feedback_id: str
    patient_id: str
    prediction_id: Optional[str] = None
    alert_id: Optional[str] = None
    clinician_name: str = "Dr. Priya Sharma"
    clinician_role: str = "Pulmonologist"
    is_useful: bool = True
    alert_relevance: str = "relevant"  # relevant, partially_relevant, false_alarm, not_applicable
    event_outcome_verification: str = "subsequently_observed"  # subsequently_observed, not_observed, unresolved
    clinical_notes: str = ""
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    is_demonstration_feedback: bool = True


class ClinicianFeedbackRepository:
    _records: List[ClinicianFeedbackRecord] = []

    @classmethod
    def add_feedback(cls, record: ClinicianFeedbackRecord) -> ClinicianFeedbackRecord:
        cls._records.insert(0, record)
        return record

    @classmethod
    def get_patient_feedback(cls, patient_id: str) -> List[Dict[str, Any]]:
        return [r.model_dump(mode="json") for r in cls._records if r.patient_id == patient_id]

    @classmethod
    def get_all_feedback(cls) -> List[Dict[str, Any]]:
        return [r.model_dump(mode="json") for r in cls._records]
