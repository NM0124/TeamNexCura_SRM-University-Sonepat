"""
Repository layer providing clean CRUD operations for observations, predictions, alerts, and timeline.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
import json
from sqlalchemy.orm import Session
from sqlalchemy import desc, select

from src.storage.models import ObservationRecord, PredictionRecord, AlertRecord, TimelineEventRecord


class ObservationRepository:
    def __init__(self, session: Session):
        self.session = session

    def add_or_update(self, record_data: Dict[str, Any]) -> ObservationRecord:
        """Idempotently inserts or updates an observation by patient_id and timestamp."""
        existing = self.session.query(ObservationRecord).filter_by(
            patient_id=record_data["patient_id"],
            timestamp=record_data["timestamp"]
        ).first()

        if existing:
            for k, v in record_data.items():
                setattr(existing, k, v)
            return existing
        else:
            record = ObservationRecord(**record_data)
            self.session.add(record)
            return record

    def get_by_patient(self, patient_id: str, limit: Optional[int] = None) -> List[ObservationRecord]:
        query = self.session.query(ObservationRecord).filter_by(patient_id=patient_id).order_by(ObservationRecord.timestamp.asc())
        if limit:
            query = query.limit(limit)
        return query.all()

    def get_latest(self, patient_id: str) -> Optional[ObservationRecord]:
        return self.session.query(ObservationRecord).filter_by(patient_id=patient_id).order_by(ObservationRecord.timestamp.desc()).first()

    def count_by_patient(self, patient_id: str) -> int:
        return self.session.query(ObservationRecord).filter_by(patient_id=patient_id).count()

    def clear_patient(self, patient_id: str):
        self.session.query(ObservationRecord).filter_by(patient_id=patient_id).delete()


class PredictionRepository:
    def __init__(self, session: Session):
        self.session = session

    def add(self, prediction_data: Dict[str, Any]) -> PredictionRecord:
        record = PredictionRecord(**prediction_data)
        self.session.add(record)
        return record

    def get_latest(self, patient_id: str) -> Optional[PredictionRecord]:
        return self.session.query(PredictionRecord).filter_by(patient_id=patient_id).order_by(PredictionRecord.prediction_timestamp.desc()).first()

    def get_history(self, patient_id: str, limit: int = 50) -> List[PredictionRecord]:
        return self.session.query(PredictionRecord).filter_by(patient_id=patient_id).order_by(PredictionRecord.prediction_timestamp.desc()).limit(limit).all()


class AlertRepository:
    def __init__(self, session: Session):
        self.session = session

    def add(self, alert_data: Dict[str, Any]) -> AlertRecord:
        record = AlertRecord(**alert_data)
        self.session.add(record)
        return record

    def get_active(self, patient_id: Optional[str] = None) -> List[AlertRecord]:
        query = self.session.query(AlertRecord).filter_by(acknowledged=False)
        if patient_id:
            query = query.filter_by(patient_id=patient_id)
        return query.order_by(AlertRecord.created_at.desc()).all()

    def get_all(self, patient_id: Optional[str] = None, limit: int = 100) -> List[AlertRecord]:
        query = self.session.query(AlertRecord)
        if patient_id:
            query = query.filter_by(patient_id=patient_id)
        return query.order_by(AlertRecord.created_at.desc()).limit(limit).all()

    def acknowledge(self, alert_id: int, acknowledged_by: str = "clinician"):
        alert = self.session.query(AlertRecord).filter_by(id=alert_id).first()
        if alert:
            alert.acknowledged = True
            alert.acknowledged_at = datetime.utcnow()
            alert.acknowledged_by = acknowledged_by
            return alert
        return None


class TimelineRepository:
    def __init__(self, session: Session):
        self.session = session

    def add(self, event_type: str, patient_id: str, timestamp: datetime, summary: str, details: Optional[Dict] = None, is_hypothetical: bool = False):
        record = TimelineEventRecord(
            patient_id=patient_id,
            event_timestamp=timestamp,
            event_type=event_type,
            summary=summary,
            details_json=json.dumps(details) if details else None,
            is_hypothetical=is_hypothetical
        )
        self.session.add(record)
        return record

    def get_timeline(self, patient_id: str, limit: int = 100) -> List[TimelineEventRecord]:
        return self.session.query(TimelineEventRecord).filter_by(patient_id=patient_id).order_by(TimelineEventRecord.event_timestamp.desc()).limit(limit).all()
