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


def test_api_patient_switching_and_isolation():
    from fastapi.testclient import TestClient
    from server import app

    with TestClient(app) as client:
        # 1. Fetch Patient 1 and Patient 2 profiles
        res1 = client.get("/api/patients/PAT-001")
        res2 = client.get("/api/patients/PAT-002")

        assert res1.status_code == 200
        assert res2.status_code == 200

        data1 = res1.json()
        data2 = res2.json()

        assert data1["patient_id"] == "PAT-001"
        assert data2["patient_id"] == "PAT-002"
        # Ensure they have independent baselines and state
        assert data1["patient_id"] != data2["patient_id"]

        # 2. Monitoring endpoint filtering
        mon1 = client.get("/api/patients/PAT-001/monitoring?limit=10")
        mon2 = client.get("/api/patients/PAT-002/monitoring?limit=10")

        assert mon1.status_code == 200
        assert mon2.status_code == 200

        obs1 = mon1.json().get("recent_observations", [])
        obs2 = mon2.json().get("recent_observations", [])

        for o in obs1:
            assert o.get("patient_id") == "PAT-001"
        for o in obs2:
            assert o.get("patient_id") == "PAT-002"


def test_api_date_filtering():
    from fastapi.testclient import TestClient
    from server import app

    with TestClient(app) as client:
        # Filtering with impossible future date range returns empty list
        mon_future = client.get("/api/patients/PAT-001/monitoring?start_date=2099-01-01T00:00:00&end_date=2099-12-31T23:59:59")
        assert mon_future.status_code == 200
        assert len(mon_future.json()["recent_observations"]) == 0

        timeline_future = client.get("/api/patients/PAT-001/timeline?start_date=2099-01-01T00:00:00&end_date=2099-12-31T23:59:59")
        assert timeline_future.status_code == 200
        assert len(timeline_future.json()) == 0


def test_api_invalid_patient_returns_404():
    from fastapi.testclient import TestClient
    from server import app

    with TestClient(app) as client:
        bad_id = "NON_EXISTENT_PATIENT_999"

        assert client.get(f"/api/patients/{bad_id}").status_code == 404
        assert client.get(f"/api/patients/{bad_id}/labs").status_code == 404
        assert client.get(f"/api/patients/{bad_id}/timeline").status_code == 404
        assert client.get(f"/api/patients/{bad_id}/prediction").status_code == 404
        assert client.get(f"/api/patients/{bad_id}/triggers").status_code == 404
        assert client.get(f"/api/patients/{bad_id}/monitoring").status_code == 404

