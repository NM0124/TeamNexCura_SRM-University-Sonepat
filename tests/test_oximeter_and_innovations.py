"""
Unit and Integration Tests for Pulse Oximeter, Innovations A/B/C, and Synthea Labs & Imaging.
"""

from datetime import datetime, timedelta
import pandas as pd
import numpy as np

from src.ingestion.oximeter_adapter import SimulatedPulseOximeterAdapter, FutureHardwarePulseOximeterAdapter
from src.prediction.trigger_fingerprint import EnvironmentalTriggerAnalyzer
from src.prediction.evidence_tracer import EvidenceTracer, EvidenceRecord
from src.prediction.reliability_lab import ReliabilityLabRunner
from src.ingestion.synthea_importer import SyntheaImporter
from config.settings import settings


def test_pulse_oximeter_modes():
    # Test Mode A: Simulated Pulse Oximeter
    adapter_a = SimulatedPulseOximeterAdapter()
    assert adapter_a.connect() is True
    status_a = adapter_a.get_status()
    assert "Simulated" in status_a["mode"]

    obs = {
        "timestamp": datetime.utcnow().isoformat(),
        "spo2_pct": 91.0,
        "heart_rate_bpm": 115,
        "signal_quality": "optimal"
    }
    packet = adapter_a.generate_packet_from_observation(obs, "PAT-001")
    assert packet.spo2_pct == 91.0
    assert packet.pulse_rate_bpm == 115
    assert packet.is_valid_reading is True
    assert len(packet.active_alarms) > 0  # Warning triggered (< 94% threshold & > 110 bpm)

    # Test Mode B: Future Hardware Adapter
    adapter_b = FutureHardwarePulseOximeterAdapter()
    assert adapter_b.connect() is False  # Safely disconnected without physical device
    status_b = adapter_b.get_status()
    assert "0x1822" in status_b["bluetooth_service_uuid"]
    assert adapter_b.read_packet("PAT-001") is None


def test_environmental_trigger_fingerprint():
    # Generate 20 synthetic observation steps with PM2.5 spikes followed by PEF drops
    observations = []
    base_time = datetime(2026, 10, 1, 8, 0, 0)
    for i in range(25):
        t = base_time + timedelta(hours=i)
        is_spike = (10 <= i <= 14)
        observations.append({
            "timestamp": t.isoformat(),
            "pm25_ug_m3": 95.0 if is_spike else 18.0,
            "pm10_ug_m3": 140.0 if is_spike else 30.0,
            "pollen_level_0_10": 4.0,
            "dust_exposure_level": 1 if is_spike else 0,
            "temperature_c": 30.0,
            "humidity_pct": 65.0,
            "peak_flow_pef_l_min": 290 if is_spike else 420,
            "respiratory_rate_bpm": 24 if is_spike else 16,
            "symptom_severity_0_3": 2 if is_spike else 0,
            "wheezing": 1 if is_spike else 0,
            "rescue_inhaler_uses": 1 if is_spike else 0
        })

    report = EnvironmentalTriggerAnalyzer.analyze_patient_triggers(
        observations=observations,
        patient_id="PAT-001",
        pef_reference=450.0
    )

    assert report["status"] == "evaluated"
    assert report["total_observations"] == 25
    assert len(report["associations"]) > 0
    assert "PM2.5" in report["associations"][0]["label"]
    # Check non-causal language constraint
    assert "temporal association" in report["associations"][0]["non_causal_statement"]


def test_evidence_traceable_prediction_and_outcome_resolution():
    features = {
        "pef_pct_of_reference": 0.72,
        "pm25_current": 82.0,
        "respiratory_rate_current": 22.0,
        "symptom_severity_current": 2.0,
        "wheezing_6h_sum": 1.0,
        "rescue_inhaler_6h_sum": 2.0
    }
    cutoff = datetime(2026, 10, 1, 12, 0, 0)
    rec = EvidenceTracer.create_evidence_record(
        patient_id="PAT-001",
        current_features=features,
        risk_score=0.68,
        risk_category="high",
        model_name="Fused HistGradientBoosting",
        cutoff_time=cutoff,
        data_quality_status="nominal"
    )

    assert rec.patient_id == "PAT-001"
    assert rec.prediction_horizon == "2 Hours"
    assert rec.outcome_resolved is False

    # Simulate subsequent 2-hour observations showing true deterioration (>= 2 readings < 80% reference 400 = 320)
    subsequent = [
        {"timestamp": (cutoff + timedelta(minutes=30)).isoformat(), "peak_flow_pef_l_min": 310},
        {"timestamp": (cutoff + timedelta(minutes=60)).isoformat(), "peak_flow_pef_l_min": 305},
        {"timestamp": (cutoff + timedelta(minutes=90)).isoformat(), "peak_flow_pef_l_min": 320}
    ]

    EvidenceTracer.resolve_prediction_outcomes([rec], subsequent, pef_reference=400.0)
    assert rec.outcome_resolved is True
    assert rec.actual_event_occurred is True
    assert rec.outcome_classification == "true_positive"


def test_synthea_lab_and_imaging_parsing():
    importer = SyntheaImporter(settings.synthea_dir)
    report = importer.scan_and_import()

    # PAT-001 has full labs (Eosinophil, IgE, CRP, Vitamin D, Serum IgA) and CT scan
    pat001 = importer.asthma_cohort.get("PAT-001")
    assert pat001 is not None
    assert len(pat001.lab_reports) >= 4

    eos = next((l for l in pat001.lab_reports if "Eosinophil" in l.test_name), None)
    assert eos is not None
    assert eos.value == 420.0
    assert eos.status == "high"

    assert len(pat001.imaging_records) >= 1
    ct = pat001.imaging_records[0]
    assert ct.modality == "CT"
    assert "air trapping" in ct.impression.lower()
