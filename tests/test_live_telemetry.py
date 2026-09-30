"""Contract tests for the live telemetry endpoint."""

import asyncio
from datetime import datetime

import httpx

from backend.api import main
from backend.api.live_telemetry import LiveTelemetryEngine


def test_live_telemetry_returns_bounded_varying_samples_with_cors() -> None:
    async def collect_samples() -> list[httpx.Response]:
        transport = httpx.ASGITransport(app=main.app, raise_app_exceptions=False)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://test",
            headers={"Origin": "http://localhost:5173"},
        ) as client:
            return [await client.get("/telemetry/live") for _ in range(25)]

    responses = asyncio.run(collect_samples())

    assert all(response.status_code == 200 for response in responses)
    assert responses[0].headers["access-control-allow-origin"] == "*"

    samples = [response.json() for response in responses]
    expected_keys = {
        "timestamp",
        "telemetry",
        "fault_classification",
        "health_score",
        "mission_recommendation",
    }
    assert all(set(sample) == expected_keys for sample in samples)
    sensor_keys = {
        "rpm",
        "egt",
        "cht",
        "fuel_flow",
        "vibration",
        "oil_temperature",
    }
    for sample in samples:
        timestamp = datetime.fromisoformat(sample["timestamp"])
        assert timestamp.tzinfo is not None
        telemetry = sample["telemetry"]
        assert set(telemetry) == sensor_keys
        assert 1800 <= telemetry["rpm"] <= 2800
        assert 120 <= telemetry["cht"] <= 250
        assert 500 <= telemetry["egt"] <= 850
        assert 5 <= telemetry["fuel_flow"] <= 40
        assert 0.5 <= telemetry["vibration"] <= 6.0
        assert 60 <= telemetry["oil_temperature"] <= 120
        assert 0 <= sample["health_score"] <= 100

    assert all(
        sample["fault_classification"]
        in {"HEALTHY", "COOLING_ISSUE", "ENGINE_DEGRADATION"}
        for sample in samples
    )
    assert all(
        sample["mission_recommendation"]
        in {"CONTINUE MISSION", "REDUCE POWER", "RETURN TO BASE"}
        for sample in samples
    )
    for key in sensor_keys:
        assert len({sample["telemetry"][key] for sample in samples}) > 1


def test_fault_modes_are_injected_and_recommendations_follow_thresholds() -> None:
    engine = LiveTelemetryEngine(seed=2026)
    samples = [engine.sample() for _ in range(100)]
    healthy = [
        sample.telemetry
        for sample in samples
        if sample.fault_classification == "HEALTHY"
    ]
    cooling = [
        sample.telemetry
        for sample in samples
        if sample.fault_classification == "COOLING_ISSUE"
    ]
    degradation = [
        sample.telemetry
        for sample in samples
        if sample.fault_classification == "ENGINE_DEGRADATION"
    ]

    assert {sample.fault_classification for sample in samples} == {
        "HEALTHY",
        "COOLING_ISSUE",
        "ENGINE_DEGRADATION",
    }

    def average(values: list[float]) -> float:
        return sum(values) / len(values)

    assert average([sample.cht for sample in cooling]) > average(
        [sample.cht for sample in healthy]
    )
    assert average([sample.egt for sample in cooling]) > average(
        [sample.egt for sample in healthy]
    )
    assert average([sample.vibration for sample in degradation]) > average(
        [sample.vibration for sample in healthy]
    )
    assert average([sample.fuel_flow for sample in degradation]) > average(
        [sample.fuel_flow for sample in healthy]
    )
    assert engine._recommendation(85) == "REDUCE POWER"
    assert engine._recommendation(85.01) == "CONTINUE MISSION"
    assert engine._recommendation(60) == "REDUCE POWER"
    assert engine._recommendation(59.99) == "RETURN TO BASE"
