"""
SQLAlchemy models for persisting patient observations, predictions, alerts, and timeline events.
Uses SQLite for local storage, fully decouplable for PostgreSQL / MySQL migration.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, Float, String, Boolean, DateTime, Text, Index
)
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class ObservationRecord(Base):
    """Stores incoming or replayed patient physiological & environmental observations."""
    __tablename__ = "observations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String(64), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    simulated_arrival_time = Column(DateTime, default=datetime.utcnow)
    source = Column(String(64), default="csv_replay")  # csv_replay, synthetic_gen, live_sensor
    session_id = Column(String(64), nullable=True)

    # Environmental
    pm25_ug_m3 = Column(Float, nullable=True)
    pm10_ug_m3 = Column(Float, nullable=True)
    temperature_c = Column(Float, nullable=True)
    humidity_pct = Column(Float, nullable=True)
    pollen_level = Column(Float, nullable=True)
    dust_exposure_level = Column(Integer, nullable=True)

    # Activity & Physiological
    exercise_flag = Column(Integer, nullable=True)
    heart_rate_bpm = Column(Integer, nullable=True)
    respiratory_rate_bpm = Column(Integer, nullable=True)
    spo2_pct = Column(Float, nullable=True)
    peak_flow_pef_l_min = Column(Integer, nullable=True)
    fev1_l = Column(Float, nullable=True)

    # Symptoms & Medications
    wheezing = Column(Integer, nullable=True)
    coughing = Column(Integer, nullable=True)
    shortness_of_breath = Column(Integer, nullable=True)
    chest_tightness = Column(Integer, nullable=True)
    symptom_severity = Column(Integer, nullable=True)
    rescue_inhaler_uses = Column(Integer, nullable=True)

    # Quality & Risk label from source
    source_risk_label = Column(String(32), nullable=True)
    quality_status = Column(String(32), default="valid")  # valid, missing_fields, implausible, etc.
    quality_notes = Column(Text, nullable=True)

    __table_args__ = (
        Index("ix_patient_timestamp", "patient_id", "timestamp", unique=True),
    )


class PredictionRecord(Base):
    """Stores model inferences and rule-based risk estimations."""
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String(64), nullable=False, index=True)
    prediction_timestamp = Column(DateTime, nullable=False, index=True)
    observation_cutoff_time = Column(DateTime, nullable=False)
    model_name = Column(String(64), nullable=False)  # baseline_logistic, hist_gb, rule_based
    model_version = Column(String(32), default="v1.0")

    # Horizon & Target
    target_name = Column(String(64), default="pef_deterioration_6h")
    horizon_hours = Column(Integer, default=6)

    # Results
    risk_score = Column(Float, nullable=True)  # probability [0.0, 1.0] or continuous score
    risk_category = Column(String(32), nullable=False)  # low, moderate, high, withheld
    withheld = Column(Boolean, default=False)
    withhold_reason = Column(String(256), nullable=True)

    # Explainability payload (JSON string of top drivers / features)
    feature_contributions_json = Column(Text, nullable=True)
    data_quality_status = Column(String(32), default="data_sufficient")


class AlertRecord(Base):
    """Stores safety alerts, deteriorating trends, or data staleness warnings."""
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String(64), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    alert_type = Column(String(64), nullable=False)  # elevated_risk, pef_decline, data_stale, inhaler_spike
    severity = Column(String(32), default="warning")  # info, warning, critical
    title = Column(String(128), nullable=False)
    message = Column(Text, nullable=False)
    source_component = Column(String(64), default="rule_engine")
    trigger_observation_time = Column(DateTime, nullable=True)

    # Resolution
    acknowledged = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime, nullable=True)
    acknowledged_by = Column(String(64), nullable=True)


class TimelineEventRecord(Base):
    """Unified chronological timeline of all events (observation, alert, baseline shift, simulation)."""
    __tablename__ = "timeline_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String(64), nullable=False, index=True)
    event_timestamp = Column(DateTime, nullable=False, index=True)
    event_type = Column(String(64), nullable=False)  # observation, prediction, alert, scenario, baseline_update
    summary = Column(String(256), nullable=False)
    details_json = Column(Text, nullable=True)
    is_hypothetical = Column(Boolean, default=False)
