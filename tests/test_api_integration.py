"""Real ASGI contract tests. No route responses or PHM calculations are mocked."""
import asyncio
import copy

import httpx
import pytest

from backend.api import main


def call(method, path, **kwargs):
    async def send():
        transport = httpx.ASGITransport(app=main.app, raise_app_exceptions=False)
        async with httpx.AsyncClient(transport=transport, base_url="http://test",
                                     headers={"Origin": "http://localhost:4174"}) as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


@pytest.fixture
def telemetry():
    return call("GET", "/api/demo-flight").json()["telemetry"]


def test_actual_frontend_replay_payload_is_serialized_and_cors_enabled(telemetry):
    response = call("POST", "/api/replay", json={"telemetry": telemetry})
    assert response.status_code == 200, response.text
    assert response.headers["access-control-allow-origin"] == "*"
    timeline = response.json()["timeline"]
    assert len(timeline) == len(telemetry) == 28
    assert [frame["timestamp"] for frame in timeline] == [row["timestamp"] for row in telemetry]
    assert all(set(frame["residuals"]) == {"rpm", "egt", "cht"} for frame in timeline)
    assert all(0 <= frame["health_score"] <= 100 for frame in timeline)


@pytest.mark.parametrize("defect", ["missing", "null", "invalid", "naive", "order", "duplicate", "empty"])
def test_replay_rejects_invalid_timestamps_and_empty_rows_with_422(telemetry, defect):
    rows = copy.deepcopy(telemetry[:2])
    if defect == "missing":
        rows[0].pop("timestamp")
    elif defect == "null":
        rows[0]["timestamp"] = None
    elif defect == "invalid":
        rows[0]["timestamp"] = "2026-02-30T07:00:00Z"
    elif defect == "naive":
        rows[0]["timestamp"] = "2026-09-10T07:00:00"
    elif defect == "order":
        rows.reverse()
    elif defect == "duplicate":
        rows[1]["timestamp"] = rows[0]["timestamp"]
    else:
        rows = []
    response = call("POST", "/api/replay", json={"telemetry": rows})
    assert response.status_code == 422, response.text
    assert response.headers["access-control-allow-origin"] == "*"


@pytest.mark.parametrize("patch", [{"rpm": True}, {"throttle": -1}, {"throttle": 101},
                                  {"rpm": "35\"66\""}, {"health_factor": 0.2}, {"egt": None}])
def test_invalid_snapshot_rejected_before_engine(telemetry, patch):
    response = call("POST", "/api/analyze", json={**telemetry[0], **patch})
    assert response.status_code == 422, response.text


@pytest.mark.parametrize("value", ["NaN", "Infinity", "-Infinity"])
def test_nonfinite_json_produces_serializable_422(value):
    response = call("POST", "/api/analyze", content='{"rpm":' + value + ',"egt":500,"cht":150,"throttle":72}',
                    headers={"Content-Type": "application/json"})
    assert response.status_code == 422, response.text
    assert isinstance(response.json()["detail"], list)


def test_error_responses_have_cors_even_on_unhandled_exception(telemetry, monkeypatch):
    def fail(_rows):
        raise RuntimeError("Controlled server failure")
    monkeypatch.setattr(main, "_replay_frames", fail)
    response = call("POST", "/api/replay", json={"telemetry": telemetry})
    assert response.status_code == 500
    assert response.headers["access-control-allow-origin"] == "*"


def test_history_and_replay_do_not_mutate_live_estimator(telemetry):
    first = {**telemetry[0], "reset_filter": True}
    second = {**telemetry[-1], "reset_filter": False}
    call("POST", "/api/analyze", json=first)
    expected = call("POST", "/api/analyze", json=second).json()
    call("POST", "/api/analyze", json=first)
    assert call("GET", "/api/health-history").status_code == 200
    assert call("POST", "/api/replay", json={"telemetry": telemetry}).status_code == 200
    actual = call("POST", "/api/analyze", json=second).json()
    assert actual == expected


def test_replay_is_repeatable_and_reset_acknowledged(telemetry):
    first = call("POST", "/api/replay", json={"telemetry": telemetry}).json()
    assert call("POST", "/reset").json() == {"status": "EKF estimator reset"}
    second = call("POST", "/api/replay", json={"telemetry": telemetry}).json()
    assert first == second


def test_all_read_endpoints_and_experiment_contracts():
    for endpoint in ["/api/demo-flight", "/api/health-history", "/api/validation"]:
        response = call("GET", endpoint)
        assert response.status_code == 200, response.text
    experiment = call("POST", "/api/experiment", json={"fault_type": "ENGINE_DEGRADATION", "magnitude": 20})
    assert experiment.status_code == 200, experiment.text
    assert experiment.json()["results"] == experiment.json()["metrics"]["experiment_details"]
    assert call("POST", "/api/experiment", json={"fault_type": "UNKNOWN", "magnitude": 20}).status_code == 422


def test_openapi_contract_preserves_replay_timestamp_and_required_vector_fields():
    schema = call("GET", "/openapi.json").json()["components"]["schemas"]
    assert "timestamp" in schema["ReplayTelemetry"]["required"]
    assert schema["ReplayTelemetry"]["properties"]["timestamp"]["format"] == "date-time"
    assert set(schema["Vector"]["required"]) == {"rpm", "egt", "cht"}
