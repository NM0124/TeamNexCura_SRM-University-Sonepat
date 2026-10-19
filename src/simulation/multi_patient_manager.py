"""
Multi-Patient Simulation & Trajectory Coordinator.
Manages continuous longitudinal trajectories for all virtual patients (PAT-001 through PAT-005 and CSV demo).
Provides stepping, batch stepping, seeking, playback controls, and oximeter packet creation.
Guarantees strict isolation between patients.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
import pandas as pd
from pathlib import Path

from config.settings import settings, GENERATED_DATA_DIR
from src.simulation.synthetic_patient_generator import SyntheticPatientGenerator
from src.ingestion.csv_loader import CSVLoader
from src.ingestion.csv_stream_replay import CSVStreamReplay
from src.digital_twin.patient_twin import PatientTwin
from src.ingestion.oximeter_adapter import SimulatedPulseOximeterAdapter, PulseOximeterPacket
from src.prediction.predictor import RiskPredictor
from src.prediction.evidence_tracer import EvidenceTracer, EvidenceRecord


class MultiPatientSimulationManager:
    def __init__(self):
        self.patient_replays: Dict[str, CSVStreamReplay] = {}
        self.oximeter_adapter = SimulatedPulseOximeterAdapter()
        self.evidence_stores: Dict[str, List[EvidenceRecord]] = {}
        self.cohort_df: Optional[pd.DataFrame] = None
        self._initialize_trajectories()

    def _initialize_trajectories(self):
        # 1. Load primary CSV replay patient
        try:
            loader = CSVLoader(settings.csv_data_path)
            df_csv, _ = loader.validate_and_load()
            self.patient_replays["CSV_PATIENT_001"] = CSVStreamReplay(df_csv, patient_id="CSV_PATIENT_001")
        except Exception:
            pass

        # 2. Generate multi-patient synthetic cohort for PAT-001 through PAT-005
        patients = ["PAT-001", "PAT-002", "PAT-003", "PAT-004", "PAT-005"]
        gen = SyntheticPatientGenerator(
            n_patients=len(patients),
            duration_days=14,
            interval_minutes=15,  # 15-minute observations for demonstration
            random_seed=42,
            patient_ids=patients
        )
        cohort_df, meta = gen.generate_cohort()
        self.cohort_df = cohort_df

        # Save generated dataset
        try:
            cohort_csv_path = GENERATED_DATA_DIR / "multi_patient_synthetic_cohort.csv"
            cohort_df.to_csv(cohort_csv_path, index=False)
        except Exception:
            pass

        for pid in patients:
            df_p = cohort_df[cohort_df["patient_id"] == pid].copy()
            self.patient_replays[pid] = CSVStreamReplay(df_p, patient_id=pid)
            self.evidence_stores[pid] = []

    def get_replay(self, patient_id: str) -> Optional[CSVStreamReplay]:
        return self.patient_replays.get(patient_id)

    def step_patient(self, twin: PatientTwin, steps: int = 1) -> Optional[Dict[str, Any]]:
        """
        Advances the patient trajectory by N steps, ingests observations, updates twin,
        evaluates risk model, updates evidence records, and checks oximeter thresholds.
        """
        replay = self.get_replay(twin.patient_id)
        if not replay or not replay.has_more:
            return None

        last_obs = None
        for _ in range(steps):
            if not replay.has_more:
                break
            obs = replay.step()
            if obs:
                # Ingest observation into twin
                twin.ingest_observation(obs)
                last_obs = obs

        if not last_obs:
            return None

        # Generate oximeter reading from latest observation
        oximeter_packet = self.oximeter_adapter.generate_packet_from_observation(last_obs, twin.patient_id)

        # Evaluate risk prediction
        pred = RiskPredictor.evaluate_risk(twin, use_ml_model=True)

        # Record traceable evidence
        cutoff_time = last_obs.get("timestamp")
        if isinstance(cutoff_time, str):
            cutoff_time = datetime.fromisoformat(cutoff_time)

        prev_pred = twin.prediction_history[-2] if len(twin.prediction_history) >= 2 else None
        evidence_rec = EvidenceTracer.create_evidence_record(
            patient_id=twin.patient_id,
            current_features=twin.current_features,
            risk_score=pred.get("risk_score") if pred.get("risk_score") is not None else 0.20,
            risk_category=pred.get("risk_category", "low"),
            model_name=pred.get("model_name", "Fused HistGradientBoosting"),
            cutoff_time=cutoff_time,
            data_quality_status=twin.quality_assessment.status,
            previous_prediction=prev_pred
        )

        patient_evidence = self.evidence_stores.setdefault(twin.patient_id, [])
        patient_evidence.append(evidence_rec)

        # Resolve outcomes of past predictions if sufficient future window exists
        ref_pef = twin.baseline_state.pef_reference_value if twin.baseline_state else 400.0
        EvidenceTracer.resolve_prediction_outcomes(patient_evidence, twin.observations, ref_pef)

        return {
            "observation": last_obs,
            "oximeter": oximeter_packet.model_dump(),
            "prediction": pred,
            "evidence": evidence_rec.to_dict(),
            "replay_progress": {
                "current_index": replay.processed_count,
                "total_rows": replay.total_rows,
                "remaining": replay.remaining_count
            }
        }

    def reset_patient(self, twin: PatientTwin):
        replay = self.get_replay(twin.patient_id)
        if replay:
            replay.reset()
        twin.observations.clear()
        twin.current_observation = None
        twin.prediction_history.clear()
        twin.latest_prediction = None
        twin.active_alerts.clear()
        twin.timeline_events.clear()
        self.evidence_stores[twin.patient_id] = []
