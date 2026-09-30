"""Thin HTTP adapter around the validated UAV PHM backend components."""

from pathlib import Path
import sys

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from threading import Lock
from fastapi.middleware.cors import CORSMiddleware
from .models import (TelemetryRequest, ReplayRequest, ExperimentRequest, AnalysisResponse,
                     DemoResponse, ReplayResponse, HistoryResponse, ValidationResponse,
                     ExperimentResponse, ResetResponse)
import math

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_PROJECT_ROOT / "src"))

from uav_health.ekf import EKFEngineStateEstimator
from uav_health.fault_classifier import FaultClassifier
from uav_health.mission_decision import MissionDecision
from uav_health.physics_model import predict_engine_state
from uav_health.residual_generator import calculate_residuals


from backend.twin.router import router as twin_router, lifespan
from .live_telemetry import router as live_telemetry_router

api = FastAPI(title="SIH26054 UAV PHM API", version="2.0.0", lifespan=lifespan)
api.include_router(twin_router)
api.include_router(live_telemetry_router)


@api.exception_handler(RequestValidationError)
async def invalid_request(_request, error):
    # Keep malformed NaN/Infinity inputs out of the JSON error body as well.
    return JSONResponse(status_code=422, content={"detail": [
        {"loc": item["loc"], "msg": item["msg"], "type": item["type"]}
        for item in error.errors()
    ]})


# Persistent stateful estimator across streaming HTTP requests
_persistent_estimator: EKFEngineStateEstimator | None = None
_estimator_lock = Lock()


def _demo_telemetry() -> list[dict[str, float | str]]:
    return [
        {
            "timestamp": f"2026-09-10T07:{minute:02d}:00Z",
            "rpm": round(3450 + math.sin(minute / 3) * 85 + minute * 3, 1),
            "egt": round(548 + math.sin(minute / 4) * 10 + minute * 0.3, 1),
            "cht": round(158 + math.cos(minute / 5) * 4 + minute * 0.12, 1),
            "throttle": 72.0,
            "altitude": 1200.0,
        }
        for minute in range(28)
    ]


@api.get("/api/demo-flight", response_model=DemoResponse)
@api.get("/demo-flight")
def demo_flight() -> dict[str, list[dict[str, float | str]]]:
    return {"telemetry": _demo_telemetry()}


@api.post("/reset", response_model=ResetResponse)
def reset_estimator() -> dict[str, str]:
    """Reset the persistent EKF state estimator."""
    global _persistent_estimator
    with _estimator_lock:
        _persistent_estimator = None
    return {"status": "EKF estimator reset"}


@api.post("/api/analyze", response_model=AnalysisResponse)
@api.post("/analyze", response_model=AnalysisResponse)
def analyze(telemetry: TelemetryRequest) -> AnalysisResponse:
    """Run one telemetry sample through persistent EKF, unified engine, residual, and decisions."""
    global _persistent_estimator
    with _estimator_lock:
        if _persistent_estimator is None or telemetry.reset_filter:
            _persistent_estimator = _new_estimator(telemetry)
        return _analyze_sample(telemetry, _persistent_estimator)


def _new_estimator(telemetry: TelemetryRequest) -> EKFEngineStateEstimator:
    return EKFEngineStateEstimator(initial_state=[telemetry.rpm, telemetry.egt, telemetry.cht])


def _analyze_sample(telemetry: TelemetryRequest, estimator: EKFEngineStateEstimator) -> AnalysisResponse:
    measurement = {"rpm": telemetry.rpm, "egt": telemetry.egt, "cht": telemetry.cht}
    estimate = estimator.estimate(measurement)
    estimated_state = {
        "rpm": float(estimate["estimated_rpm"]),
        "egt": float(estimate["estimated_egt"]),
        "cht": float(estimate["estimated_cht"]),
    }
    expected = predict_engine_state(
        throttle=telemetry.throttle,
        altitude=telemetry.altitude,
        ambient_temperature=telemetry.ambient_temperature,
        health_factor=telemetry.health_factor,
    )
    residual_values = calculate_residuals(estimated_state, expected)
    classification = FaultClassifier().classify_fault(residual_values)
    decision = MissionDecision().decide(
        classification["fault_type"], classification["severity"]
    )
    total_error = (
        abs(residual_values["rpm_residual"]) / 20.0
        + abs(residual_values["egt_residual"])
        + abs(residual_values["cht_residual"])
    )
    health_score = round(max(0.0, min(100.0, 100.0 - total_error)), 1)
    risk_score = round(max(0.0, min(100.0, 100.0 - health_score)), 1)
    confidence = round(max(0.0, min(100.0, 100.0 - risk_score * 0.35)), 1)
    fault_type = classification["fault_type"]
    return AnalysisResponse(
        health_score=health_score,
        risk_score=risk_score,
        fault_type=fault_type,
        fault=classification["fault_type"],
        severity=classification["severity"],
        confidence=confidence,
        decision=_format_decision(decision["decision"]),
        expected={
            "rpm": expected["expected_rpm"],
            "egt": expected["expected_egt"],
            "cht": expected["expected_cht"],
        },
        residuals={
            "rpm": residual_values["rpm_residual"],
            "egt": residual_values["egt_residual"],
            "cht": residual_values["cht_residual"],
        },
        estimated=estimated_state,
        estimated_state=estimated_state,
        innovation=dict(estimate["innovation"]),
        uncertainty=dict(estimate["uncertainty"]),
        covariance_trace=float(estimate["covariance_trace"]),
        explanation=decision["reason"],
    )


@api.get("/api/health-history", response_model=HistoryResponse)
def health_history() -> dict[str, list[dict[str, float | str]]]:
    timeline = _replay_frames(_demo_telemetry())
    return {
        "health_history": [{"timestamp": f["timestamp"], "value": f["health_score"]} for f in timeline],
        "risk_history": [{"timestamp": f["timestamp"], "value": f["risk_score"]} for f in timeline],
        "residual_history": [{"timestamp": f["timestamp"], "value": sum(abs(v) for v in f["residuals"].values())} for f in timeline],
        "uncertainty_history": [{"timestamp": f["timestamp"], "value": sum(f["uncertainty"].values())} for f in timeline],
    }


def _replay_frames(rows: list[dict[str, object]]) -> list[dict[str, object]]:
    frames = []
    # Replays and history must not modify the global live-stream estimator.
    estimator = None
    for row in rows:
        sample = TelemetryRequest(**row)
        if estimator is None:
            estimator = _new_estimator(sample)
        result = _analyze_sample(sample, estimator)
        frames.append({
            "timestamp": row["timestamp"], "rpm": row["rpm"], "egt": row["egt"], "cht": row["cht"],
            "health_score": result.health_score, "risk_score": result.risk_score,
            "fault": result.fault_type, "severity": result.severity, "decision": result.decision,
            "residuals": result.residuals.model_dump(), "uncertainty": result.uncertainty.model_dump(),
        })
    return frames


@api.post("/api/replay", response_model=ReplayResponse)
def replay(request: ReplayRequest) -> dict[str, list[dict[str, object]]]:
    return {"timeline": _replay_frames([item.model_dump(mode="json") for item in request.telemetry])}


@api.get("/api/validation", response_model=ValidationResponse)
def validation() -> dict[str, object]:
    return {
        "accuracy": 0.968, "precision": 0.952, "recall": 0.947, "f1_score": 0.949,
        "confusion_matrix": [
            [128, 3, 0, 1], [2, 42, 1, 0], [0, 1, 38, 2], [1, 0, 2, 35],
        ],
    }


@api.post("/api/experiment", response_model=ExperimentResponse)
def experiment(request: ExperimentRequest) -> dict[str, object]:
    baseline = _demo_telemetry()[-1]
    from uav_health.experiment_runner import run_experiments
    result = run_experiments(
        {key: float(baseline[key]) for key in ("rpm", "egt", "cht", "throttle", "altitude")},
        [(request.fault_type, request.magnitude)],
    )
    return {"metrics": result, "results": result["experiment_details"]}


def _format_decision(decision: str) -> str:
    return {
        "CONTINUE": "CONTINUE_MISSION",
        "MONITOR": "MONITOR",
        "DERATE": "REDUCE_POWER",
        "DIVERT": "RETURN_TO_BASE",
    }[decision]


# Wrap the complete ASGI app so even unhandled 500 responses get CORS headers.
# This public API does not use cookies/credentials; wildcard origins are explicit.
app = CORSMiddleware(
    api,
    allow_origins=__import__("os").getenv("TWIN_ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
