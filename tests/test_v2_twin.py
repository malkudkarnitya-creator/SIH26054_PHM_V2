"""Model behavior, durable state, transport and legacy compatibility checks."""
import copy
import json
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from backend.api.main import app
from backend.twin.model import EngineState, SIGNALS, advance, assess
from backend.twin.schemas import Controls, Mission, Telemetry, WhatIf
from backend.twin.service import TwinService


def settled(scenario="nominal"):
    state, controls = EngineState(), Controls(scenario=scenario)
    for _ in range(120):
        advance(state, controls, 1, noise=False)
    return state, controls


def test_nominal_health_rul_and_reliability_are_bounded_and_reproducible():
    state, controls = settled()
    result = assess(state, controls)
    assert 90 < result["health_index"] <= 100
    assert result["rul"]["lower_hours"] < result["rul"]["hours"] < result["rul"]["upper_hours"]
    assert 95 < result["mission"]["reliability_percent"] <= 100
    assert result["maintenance"][0]["priority"] == "routine"
    assert result == assess(state, controls)


@pytest.mark.parametrize("scenario,fault", [("cooling_loss", "Thermal overload"), ("oil_leak", "Lubrication pressure loss"), ("bearing_wear", "Rotating assembly anomaly"), ("fuel_restriction", "Fuel delivery anomaly")])
def test_injected_faults_reduce_health_rul_and_reliability_with_traceable_reason(scenario, fault):
    normal, config = settled()
    baseline = assess(normal, config)
    state, controls = settled(scenario)
    result = assess(state, controls)
    assert result["health_index"] < baseline["health_index"]
    assert result["rul"]["hours"] < baseline["rul"]["hours"]
    assert result["mission"]["reliability_percent"] < baseline["mission"]["reliability_percent"]
    assert fault in [item["failure_mode"] for item in result["maintenance"]]
    assert sum(item["importance"] for item in result["explainability"]["features"]) == pytest.approx(100, abs=.3)
    assert result["health_index"] == pytest.approx(100-result["explainability"]["health_penalty"]-result["explainability"]["wear_penalty"], abs=.1)


def test_duration_environment_and_wear_monotonicity():
    state, controls = settled()
    baseline = assess(state, controls)
    controls.mission.duration_hours = 24
    assert assess(state, controls)["mission"]["reliability_percent"] < baseline["mission"]["reliability_percent"]
    controls.mission = Mission(environmental_severity=1.0)
    harsh = assess(state, controls)
    assert harsh["rul"]["hours"] < baseline["rul"]["hours"]
    assert harsh["mission"]["reliability_percent"] < baseline["mission"]["reliability_percent"]
    state.wear = 1
    result = assess(state, controls)
    assert result["rul"]["hours"] == 0
    assert result["mission"]["reliability_percent"] == 0
    assert result["mission"]["decision"] == "HOLD / INSPECT"


def test_what_if_isolated_repeatable_and_compared_at_equal_horizon():
    service = TwinService(":memory:")
    try:
        before = copy.deepcopy(service.state)
        config = service.controls.model_dump()
        zero = service.what_if(WhatIf())
        assert zero["delta"] == {"reliability_points": 0, "rul_hours": 0, "health_points": 0}
        reduced = service.what_if(WhatIf(rpm_adjustment=-800.0))
        assert reduced["delta"]["rul_hours"] > 0
        assert reduced["delta"]["reliability_points"] > 0
        assert reduced["trajectory"][-1]["minutes"] == 15
        assert service.state == before
        assert service.controls.model_dump() == config
        assert service.sequence == 0
        assert service.history() == []
        assert reduced == service.what_if(WhatIf(rpm_adjustment=-800.0))
        bound = service.what_if(WhatIf(rpm_adjustment=1500.0, temperature_variation=30.0))
        assert bound["effective_controls"]["rpm_target"] == 5800
    finally:
        service.close()


def test_checkpoint_and_telemetry_survive_restart(tmp_path):
    database = str(tmp_path / "twin.sqlite3")
    service = TwinService(database)
    service.configure(Controls(source="telemetry"))
    assert service.snapshot()["quality"]["status"] == "waiting"
    telemetry = Telemetry(timestamp=datetime.now(timezone.utc), sensors=EngineState().sensors)
    sample = service.ingest(telemetry)
    with pytest.raises(ValueError, match="strictly increasing"):
        service.ingest(telemetry)
    with pytest.raises(ValueError, match="last 10 seconds"):
        service.ingest(telemetry.model_copy(update={"timestamp": datetime.now(timezone.utc)-timedelta(seconds=30)}))
    service.close()
    restored = TwinService(database)
    try:
        assert restored.snapshot()["sensors"] == sample["sensors"]
        assert restored.sequence == sample["sequence"]
        assert len(restored.history()) == 1
        restored.observed_at = datetime.now(timezone.utc)-timedelta(seconds=6)
        assert restored.snapshot()["quality"]["status"] == "stale"
        assert restored.snapshot()["explainability"]["confidence_percent"] == 0
    finally:
        restored.close()


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("TWIN_DATABASE", ":memory:")
    with TestClient(app) as client:
        yield client


def test_v2_http_stream_and_legacy_routes(client):
    assert client.get("/api/v2/health").status_code == 200
    snapshot = client.get("/api/v2/twin").json()
    assert set(snapshot["sensors"]) == set(SIGNALS)
    assert client.post("/api/v2/what-if", json={"rpm_adjustment": -300}).status_code == 200
    assert client.get("/api/v2/report").json()["snapshot"]["engine_id"] == "VAYU-01"
    assert client.get("/api/v2/history?limit=999999").status_code == 422
    with client.websocket_connect("/api/v2/stream") as socket:
        assert socket.receive_json()["engine_id"] == "VAYU-01"
    rows = client.get("/api/demo-flight").json()["telemetry"]
    assert client.post("/api/analyze", json=rows[-1]).status_code == 200
    assert client.post("/api/replay", json={"telemetry": rows}).status_code == 200


@pytest.mark.parametrize("path,payload", [("/controls", {"rpm_target": True}), ("/controls", {"rpm_target": 60000}), ("/controls", {"mission": {"environmental_severity": 2}}), ("/what-if", {"temperature_variation": "hot"}), ("/what-if", {"horizon_minutes": 10000}), ("/controls", {"unknown": 1})])
def test_invalid_v2_inputs_rejected(client, path, payload):
    assert client.post('/api/v2'+path, json=payload).status_code == 422


def test_nonfinite_and_incomplete_samples_rejected(client):
    assert client.post("/api/v2/what-if", content='{"rpm_adjustment":NaN}', headers={"Content-Type":"application/json"}).status_code == 422
    assert client.post("/api/v2/telemetry", json={"timestamp":"2026-01-01T00:00:00Z","sensors":{"rpm":4800}}).status_code == 422
    assert client.post("/api/v2/telemetry", json={"timestamp":datetime.now(timezone.utc).isoformat(),"sensors":EngineState().sensors}).status_code == 409


def test_paused_simulator_does_not_advance(client):
    controls = client.get("/api/v2/twin").json()["controls"]
    controls["running"] = False
    result = client.post("/api/v2/controls", json=controls)
    assert result.status_code == 200
    assert result.json()["quality"]["status"] == "paused"
