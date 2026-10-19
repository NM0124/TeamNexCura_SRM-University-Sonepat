"""
Unit tests for Patient Isolation and Scenario Non-Mutation.
Ensures observations or scenario modifications for one patient never bleed into another patient.
"""

from datetime import datetime
from src.digital_twin.patient_registry import PatientRegistry
from src.digital_twin.patient_twin import PatientTwin
from src.simulation.scenario_engine import ScenarioEngine


def test_strict_patient_isolation():
    registry = PatientRegistry()
    twin_a = registry.register_patient("PATIENT_ALPHA")
    twin_b = registry.register_patient("PATIENT_BETA")

    obs_a = {
        "timestamp": datetime.utcnow().isoformat(),
        "peak_flow_pef_l_min": 320,
        "spo2_pct": 94.0,
        "respiratory_rate_bpm": 22,
        "symptom_severity": 3,
        "rescue_inhaler_uses": 2,
        "pm25_ug_m3": 60.0
    }

    # Ingest for Patient A only
    twin_a.ingest_observation(obs_a)

    # Verify Patient A state updated
    assert len(twin_a.observations) == 1
    assert twin_a.current_observation["peak_flow_pef_l_min"] == 320

    # Verify Patient B remains completely unmutated
    assert len(twin_b.observations) == 0
    assert twin_b.current_observation is None
    assert twin_b.baseline_state.observation_count == 0


def test_scenario_simulation_never_mutates_live_twin():
    twin = PatientTwin("PATIENT_SCENARIO")
    real_obs = {
        "timestamp": datetime.utcnow().isoformat(),
        "peak_flow_pef_l_min": 450,
        "spo2_pct": 99.0,
        "respiratory_rate_bpm": 14,
        "symptom_severity": 0,
        "rescue_inhaler_uses": 0,
        "pm25_ug_m3": 12.0
    }
    twin.ingest_observation(real_obs)

    # Run severe hypothetical scenario: PM2.5 +80, PEF drop -35%
    result = ScenarioEngine.run_hypothetical_scenario(
        twin=twin,
        delta_pm25=80.0,
        pef_multiplier=0.65
    )

    assert result["is_hypothetical"] is True
    assert result["hypothetical_state"]["pm25_ug_m3"] == 92.0
    assert result["hypothetical_state"]["pef_l_min"] < 350

    # Verify original twin state was NOT mutated
    assert twin.current_observation["pm25_ug_m3"] == 12.0
    assert twin.current_observation["peak_flow_pef_l_min"] == 450
    assert len(twin.observations) == 1
