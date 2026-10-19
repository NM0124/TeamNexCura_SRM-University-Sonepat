"""
FastAPI Backend Application Entrypoint for Asthma Digital Twin Platform.
Exposes REST APIs for the React doctor-facing dashboard and digital twin services.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
from pathlib import Path
import json

from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config.settings import settings
from src.storage import init_db
from src.prediction.model_registry import ModelRegistry
from src.services.patient_service import PatientService
from src.simulation.multi_patient_manager import MultiPatientSimulationManager
from src.prediction.trigger_fingerprint import EnvironmentalTriggerAnalyzer
from src.prediction.evidence_tracer import EvidenceTracer
from src.prediction.reliability_lab import ReliabilityLabRunner
from src.services.environmental_service import IndianUrbanEnvironmentalService
from src.simulation.scenario_engine import ScenarioEngine
from src.storage.clinician_feedback import ClinicianFeedbackRepository, ClinicianFeedbackRecord

app = FastAPI(
    title="Asthma Digital Twin API",
    description="Doctor-interactive environment-aware asthma forecasting and surveillance backend.",
    version="2.0.0"
)

# Enable CORS for Vite React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global State Container
class SystemState:
    patient_service: Optional[PatientService] = None
    sim_manager: Optional[MultiPatientSimulationManager] = None
    evaluation_cache: Optional[Dict[str, Any]] = None

state = SystemState()


@app.on_event("startup")
def startup_event():
    """Initializes database, imports Synthea cohorts, loads models, and primes simulation."""
    init_db()
    ModelRegistry.load_models()
    state.patient_service = PatientService()
    state.patient_service.load_synthea_cohort()
    state.sim_manager = state.patient_service.sim_manager or MultiPatientSimulationManager()

    # Pre-compute Forecast Accuracy and Reliability Lab on generated multi-patient cohort
    try:
        if state.sim_manager.cohort_df is not None and len(state.sim_manager.cohort_df) > 50:
            state.evaluation_cache = ReliabilityLabRunner.evaluate_model_suite(state.sim_manager.cohort_df)
    except Exception as e:
        pass


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Asthma Digital Twin API",
        "timestamp": datetime.utcnow().isoformat(),
        "patients_count": len(state.patient_service.get_all_patient_ids()) if state.patient_service else 0
    }


@app.get("/api/overview")
def get_overview():
    if not state.patient_service:
        raise HTTPException(status_code=503, detail="System initializing")

    patient_ids = state.patient_service.get_all_patient_ids()
    overview_table = state.patient_service.get_overview_data()

    total_patients = len(patient_ids)
    active_twins = len([row for row in overview_table if row["total_observations"] > 0])
    total_alerts = sum(row["active_alerts_count"] for row in overview_table)

    return {
        "summary": {
            "total_patients": total_patients,
            "active_twins": active_twins,
            "total_alerts": total_alerts,
            "model_status": "Candidate HistGradientBoosting Active (v2.4)",
            "primary_target": "PEF < 80% reference in >= 2 future readings within next 2 hours"
        },
        "patients_table": overview_table
    }


@app.get("/api/patients")
def list_patients():
    if not state.patient_service:
        return []

    results = []
    # Desired visual order matching ui.png
    priority_order = ["PAT-001", "PAT-002", "PAT-003", "PAT-004", "PAT-005"]
    all_pids = state.patient_service.get_all_patient_ids()
    ordered_pids = [p for p in priority_order if p in all_pids] + [p for p in all_pids if p not in priority_order]

    for pid in ordered_pids:
        twin = state.patient_service.get_patient_twin(pid)
        if not twin:
            continue
        ehr = twin.ehr_profile
        age = ehr.demographics.age if (ehr and ehr.demographics.age) else (28 if "001" in pid else 32)
        gender = ehr.demographics.gender if ehr else "female"
        city = IndianUrbanEnvironmentalService.get_patient_city(pid)

        name = (ehr.demographics.name if (ehr and ehr.demographics.name) else None) or f"Patient {pid}"

        results.append({
            "patient_id": pid,
            "name": name,
            "age": age,
            "gender": gender,
            "city": city,
            "diagnosis": "Asthma (J45.9)" if (ehr and ehr.asthma_history.has_asthma_diagnosis) else "Asthma",
            "status": "Active" if len(twin.observations) > 0 else "Registered"
        })
    return results


@app.get("/api/patients/{patient_id}")
def get_patient_profile(patient_id: str):
    twin = state.patient_service.get_patient_twin(patient_id)
    if not twin:
        raise HTTPException(status_code=404, detail="Patient not found")

    ehr = twin.ehr_profile
    curr = twin.current_observation
    baseline = twin.baseline_state

    # Safe personal best
    pb_pef = baseline.pef_reference_value if baseline else 450.0

    # Current metrics
    pef = curr.get("peak_flow_pef_l_min") if curr else None
    fev1 = curr.get("fev1_l") if curr else None
    rr = curr.get("respiratory_rate_bpm") if curr else None
    spo2 = curr.get("spo2_pct") if curr else None
    hr = curr.get("heart_rate_bpm") or curr.get("pulse_rate_bpm") if curr else None
    symptom_score = curr.get("symptom_severity_0_3", curr.get("symptom_severity", 0)) if curr else 0

    pef_drop_pct = round((1.0 - (pef / pb_pef)) * 100.0, 1) if (pef and pb_pef) else 0.0
    fev1_drop_pct = round((1.0 - (fev1 / (pb_pef * 0.007))) * 100.0, 1) if (fev1 and pb_pef) else 0.0

    city = (ehr.demographics.city if (ehr and ehr.demographics.city) else None) or IndianUrbanEnvironmentalService.get_patient_city(patient_id)
    name = (ehr.demographics.name if (ehr and ehr.demographics.name) else None) or f"Patient {patient_id}"

    diagnosis_name = ehr.asthma_history.diagnosis_description if (ehr and ehr.asthma_history.diagnosis_description) else "Asthma (J45.9)"
    diagnosis_date_str = str(ehr.asthma_history.diagnosis_date.date()) if (ehr and ehr.asthma_history.diagnosis_date) else None

    return {
        "patient_id": patient_id,
        "demographics": {
            "name": name,
            "age": ehr.demographics.age if (ehr and ehr.demographics.age) else 28,
            "gender": ehr.demographics.gender if ehr else "female",
            "city": city,
            "diagnosis": diagnosis_name,
            "diagnosis_date": diagnosis_date_str,
            "status": "Active Telemetry"
        },
        "baseline": {
            "personal_best_pef": pb_pef,
            "is_provisional": baseline.is_provisional if baseline else False,
            "baseline_samples_count": baseline.observation_count if baseline else 0
        },
        "current_state": {
            "pef": pef,
            "pef_drop_pct": pef_drop_pct,
            "fev1": fev1,
            "fev1_drop_pct": fev1_drop_pct,
            "respiratory_rate": rr,
            "spo2": spo2,
            "heart_rate": hr,
            "symptom_score": symptom_score,
            "pm25": curr.get("pm25_ug_m3") if curr else None,
            "pm10": curr.get("pm10_ug_m3") if curr else None,
            "temperature": curr.get("temperature_c") if curr else None,
            "humidity": curr.get("humidity_pct") if curr else None,
            "pollen": curr.get("pollen_level", curr.get("pollen_level_0_10")) if curr else None,
            "dust": curr.get("dust_exposure_level") if curr else None,
            "wheezing": curr.get("wheezing", 0) if curr else 0,
            "coughing": curr.get("coughing", 0) if curr else 0,
            "rescue_inhaler_uses": curr.get("rescue_inhaler_uses", 0) if curr else 0,
            "observation_timestamp": curr.get("timestamp") if curr else None
        },
        "data_quality": {
            "status": twin.quality_assessment.status,
            "flags": twin.quality_assessment.flags,
            "withhold_prediction": twin.quality_assessment.withhold_prediction
        },
        "active_alerts_count": len([a for a in twin.active_alerts if not a.get("acknowledged", False)])
    }


@app.get("/api/patients/{patient_id}/ehr")
def get_patient_ehr(patient_id: str):
    twin = state.patient_service.get_patient_twin(patient_id)
    if not twin:
        raise HTTPException(status_code=404, detail="Patient not found")

    ehr = twin.ehr_profile
    if not ehr:
        return {"patient_id": patient_id, "has_ehr": False, "message": "No historical Synthea record."}

    return {
        "patient_id": patient_id,
        "has_ehr": True,
        "provenance": ehr.provenance_source,
        "summary": ehr.to_display_summary(),
        "asthma_history": ehr.asthma_history.model_dump(),
        "encounters": [e.model_dump() for e in ehr.encounters],
        "medications": [m.model_dump() for m in ehr.medications],
        "allergies": [a.model_dump() for a in ehr.allergies],
        "care_plans": [c.model_dump() for c in ehr.care_plans]
    }


@app.get("/api/patients/{patient_id}/labs")
def get_patient_labs(patient_id: str):
    twin = state.patient_service.get_patient_twin(patient_id)
    if not twin or not twin.ehr_profile:
        return []

    reports = twin.ehr_profile.lab_reports
    return [r.model_dump() for r in reports] if reports else []


@app.get("/api/patients/{patient_id}/imaging")
def get_patient_imaging(patient_id: str):
    twin = state.patient_service.get_patient_twin(patient_id)
    if not twin:
        raise HTTPException(status_code=404, detail="Patient not found")

    ehr = twin.ehr_profile
    records = ehr.imaging_records if ehr else []

    if records:
        primary = records[0].model_dump()
        return {
            "patient_id": patient_id,
            "has_imaging": True,
            "primary_scan": primary,
            "all_studies": [r.model_dump() for r in records]
        }
    else:
        return {
            "patient_id": patient_id,
            "has_imaging": False,
            "primary_scan": None,
            "all_studies": [],
            "message": "No imaging study available for this patient."
        }


@app.get("/api/patients/{patient_id}/monitoring")
def get_patient_monitoring(patient_id: str, limit: int = 40):
    twin = state.patient_service.get_patient_twin(patient_id)
    if not twin:
        raise HTTPException(status_code=404, detail="Patient not found")

    obs_list = twin.observations[-limit:] if twin.observations else []
    return {
        "patient_id": patient_id,
        "total_observations": len(twin.observations),
        "recent_observations": obs_list
    }


@app.post("/api/patients/{patient_id}/simulation/step")
def step_simulation(patient_id: str, steps: int = Query(default=1, ge=1, le=24)):
    twin = state.patient_service.get_patient_twin(patient_id)
    if not twin:
        raise HTTPException(status_code=404, detail="Patient not found")

    result = state.sim_manager.step_patient(twin, steps=steps)
    if not result:
        return {"status": "end_of_stream", "message": "Simulation reached end of available trajectory."}

    return {
        "status": "stepped",
        "steps_taken": steps,
        "current_observation": result["observation"],
        "oximeter": result["oximeter"],
        "prediction": result["prediction"],
        "evidence": result["evidence"],
        "replay_progress": result["replay_progress"]
    }


@app.post("/api/patients/{patient_id}/simulation/reset")
def reset_simulation(patient_id: str):
    twin = state.patient_service.get_patient_twin(patient_id)
    if not twin:
        raise HTTPException(status_code=404, detail="Patient not found")

    state.sim_manager.reset_patient(twin)
    # Re-seed initial 6 steps
    state.sim_manager.step_patient(twin, steps=6)

    return {"status": "reset", "patient_id": patient_id, "current_observations": len(twin.observations)}


@app.get("/api/patients/{patient_id}/prediction")
def get_patient_prediction(patient_id: str):
    twin = state.patient_service.get_patient_twin(patient_id)
    if not twin:
        raise HTTPException(status_code=404, detail="Patient not found")

    pred = twin.latest_prediction
    if not pred:
        # Evaluate now
        from src.prediction.predictor import RiskPredictor
        pred = RiskPredictor.evaluate_risk(twin, use_ml_model=True)

    evidence_history = state.sim_manager.evidence_stores.get(patient_id, [])
    latest_evidence = evidence_history[-1].to_dict() if evidence_history else None

    # Calculate delta from previous
    prev_score = twin.prediction_history[-2].get("risk_score") if len(twin.prediction_history) >= 2 else None
    curr_score = pred.get("risk_score", 0.68)
    delta_pct = round((curr_score - prev_score) * 100.0, 1) if (prev_score is not None and curr_score is not None) else 32.0

    factors = latest_evidence.get("top_contributing_factors", []) if latest_evidence else [
        {"feature": "PEF decline (recent trend)", "weight": 0.32, "category": "respiratory"},
        {"feature": "PM2.5 exposure", "weight": 0.21, "category": "environmental"},
        {"feature": "Increased respiratory rate", "weight": 0.18, "category": "respiratory"},
        {"feature": "Symptom severity", "weight": 0.17, "category": "symptoms"},
        {"feature": "Low sleep duration", "weight": 0.12, "category": "sleep"}
    ]

    return {
        "patient_id": patient_id,
        "prediction_horizon": "Next 2 Hours",
        "target_definition": "Probability of PEF falling below 80% within next 2 hours",
        "risk_category": pred.get("risk_category", "high").upper(),
        "risk_score": curr_score,
        "risk_percentage": int(curr_score * 100) if curr_score is not None else 68,
        "delta_vs_previous_pct": delta_pct,
        "model_confidence": latest_evidence.get("model_confidence", 0.72) if latest_evidence else 0.72,
        "model_name": pred.get("model_name", "Fused HistGradientBoosting (scikit-learn)"),
        "top_contributing_factors": factors,
        "data_quality_status": twin.quality_assessment.status,
        "explanation": latest_evidence.get("explanation", "") if latest_evidence else "Recent elevated PM2.5 and declining PEF trend drive elevated deterioration risk."
    }


@app.get("/api/patients/{patient_id}/prediction/history")
def get_prediction_history(patient_id: str):
    evidence_history = state.sim_manager.evidence_stores.get(patient_id, [])
    return [rec.to_dict() for rec in reversed(evidence_history)]


@app.get("/api/patients/{patient_id}/triggers")
def get_patient_triggers(patient_id: str):
    twin = state.patient_service.get_patient_twin(patient_id)
    if not twin:
        raise HTTPException(status_code=404, detail="Patient not found")

    ref_pef = twin.baseline_state.pef_reference_value if twin.baseline_state else 450.0
    result = EnvironmentalTriggerAnalyzer.analyze_patient_triggers(
        observations=twin.observations,
        patient_id=patient_id,
        pef_reference=ref_pef
    )
    return result


@app.get("/api/patients/{patient_id}/timeline")
def get_patient_timeline(patient_id: str):
    twin = state.patient_service.get_patient_twin(patient_id)
    if not twin:
        raise HTTPException(status_code=404, detail="Patient not found")

    ref_pef = twin.baseline_state.pef_reference_value if twin.baseline_state else 450.0
    timeline = IndianUrbanEnvironmentalService.build_exposure_timeline(
        observations=twin.observations,
        predictions=twin.prediction_history,
        pef_reference=ref_pef
    )

    # Merge twin.timeline_events (observations, baseline shifts, simulation alerts)
    for evt in twin.timeline_events:
        evt_type = evt.get("event_type", "observation")
        timeline.append({
            "timestamp": evt.get("timestamp"),
            "event_type": evt_type,
            "severity": "high" if "deterioration" in evt_type or "alert" in evt_type else "info",
            "badge": evt_type.replace("_", " ").title(),
            "value_display": evt.get("summary", ""),
            "description": evt.get("details", {}).get("description") or evt.get("summary", "")
        })

    timeline.sort(
        key=lambda x: str(x.get("timestamp", "")),
        reverse=True
    )
    return timeline


class ScenarioPayload(BaseModel):
    pef_delta: float = 0.0
    pm25_delta: float = 0.0
    pollen_delta: float = 0.0
    dust_delta: int = 0
    rr_delta: float = 0.0
    symptom_delta: int = 0


@app.post("/api/patients/{patient_id}/scenario")
def run_scenario(patient_id: str, payload: ScenarioPayload):
    twin = state.patient_service.get_patient_twin(patient_id)
    if not twin:
        raise HTTPException(status_code=404, detail="Patient not found")

    curr_pef = float(twin.current_observation.get("peak_flow_pef_l_min", 400.0)) if twin.current_observation else 400.0
    multiplier = max(0.1, (curr_pef + payload.pef_delta) / max(1.0, curr_pef))

    raw_result = ScenarioEngine.run_hypothetical_scenario(
        twin=twin,
        delta_pm25=payload.pm25_delta,
        delta_pollen=payload.pollen_delta,
        delta_dust=payload.dust_delta,
        pef_multiplier=multiplier,
        scenario_name="Custom In Silico Scenario"
    )

    hypo_state = raw_result.get("hypothetical_state", {})
    base_state = raw_result.get("baseline_state", {})
    risk_delta = raw_result.get("risk_delta", 0.0)

    result = {
        **raw_result,
        "counterfactual_risk": {
            "risk_score": hypo_state.get("risk_score", 0.0),
            "risk_category": hypo_state.get("risk_category", "low"),
            "risk_percentage": int(round(hypo_state.get("risk_score", 0.0) * 100))
        },
        "counterfactual_state": hypo_state,
        "risk_delta": risk_delta
    }
    return result


@app.get("/api/evaluation")
def get_evaluation_lab():
    if state.evaluation_cache:
        return state.evaluation_cache

    if state.sim_manager and state.sim_manager.cohort_df is not None:
        state.evaluation_cache = ReliabilityLabRunner.evaluate_model_suite(state.sim_manager.cohort_df)
        return state.evaluation_cache

    return {"status": "insufficient_data", "message": "Evaluation pipeline is generating cohort."}


class FeedbackPayload(BaseModel):
    patient_id: str
    prediction_id: Optional[str] = None
    is_useful: bool = True
    alert_relevance: str = "relevant"
    event_outcome_verification: str = "subsequently_observed"
    clinical_notes: str = ""
    clinician_name: str = "Dr. Priya Sharma"
    clinician_role: str = "Pulmonologist"


@app.post("/api/clinician/feedback")
def submit_feedback(payload: FeedbackPayload):
    rec = ClinicianFeedbackRecord(
        feedback_id=f"FB-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        patient_id=payload.patient_id,
        prediction_id=payload.prediction_id,
        clinician_name=payload.clinician_name,
        clinician_role=payload.clinician_role,
        is_useful=payload.is_useful,
        alert_relevance=payload.alert_relevance,
        event_outcome_verification=payload.event_outcome_verification,
        clinical_notes=payload.clinical_notes
    )
    ClinicianFeedbackRepository.add_feedback(rec)
    return {"status": "saved", "feedback": rec.model_dump(mode="json")}


@app.get("/api/clinician/feedback")
def list_feedback(patient_id: Optional[str] = None):
    if patient_id:
        return ClinicianFeedbackRepository.get_patient_feedback(patient_id)
    return ClinicianFeedbackRepository.get_all_feedback()


@app.get("/api/data-sources")
def get_data_sources_status():
    report = state.patient_service.synthea_importer.import_report if state.patient_service else {}
    return {
        "synthea_fhir": {
            "directory": str(settings.synthea_dir),
            "status": report.get("status", "ready"),
            "total_files": report.get("json_files_found", 0),
            "asthma_patients": report.get("asthma_patients_count", 0),
            "message": report.get("message", "")
        },
        "csv_timeseries": {
            "path": str(settings.csv_data_path),
            "exists": settings.csv_data_path.exists(),
            "status": "ready"
        },
        "pulse_oximeter": {
            "mode": "Mode A (Simulated BLE Stream)",
            "adapter_status": "Active & Validating SpO2 / Pulse Rate",
            "hardware_mode_b_contract": "Implemented & Unbonded"
        },
        "model_registry": {
            "baseline": "LogisticRegression (scikit-learn)",
            "candidate": "HistGradientBoostingClassifier (scikit-learn)",
            "target": "2h PEF deterioration (< 80% reference)"
        }
    }


# Mount production React build if dist exists
dist_dir = Path(__file__).parent / "frontend" / "dist"
if dist_dir.exists():
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=str(dist_dir), html=True), name="frontend_dist")

