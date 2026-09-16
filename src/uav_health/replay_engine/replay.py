"""Replay telemetry rows through the engine health monitoring pipeline."""

from dataclasses import dataclass
from pathlib import Path
import time
from typing import TypeAlias

from uav_health.ekf import EKFEngineStateEstimator
from uav_health.fault_classifier import FaultClassifier
from uav_health.flight_data import load_telemetry_csv
from uav_health.mission_decision import MissionDecision
from uav_health.physics_model import SimplePhysicsModel
from uav_health.residual_generator import calculate_residuals

PathLike: TypeAlias = str | Path


@dataclass(frozen=True)
class ReplayResult:
    """Result produced for one replayed telemetry row, including EKF estimation and health history."""

    timestamp: str
    measured_values: dict[str, float]
    residuals: dict[str, float]
    fault_type: str
    severity: str
    decision: str
    reason: str
    estimated_state: dict[str, float] | None = None
    innovation: dict[str, float] | None = None
    uncertainty: dict[str, float] | None = None
    health_score: float = 100.0

    @property
    def fault(self) -> str:
        """Alias for fault_type for health history support."""
        return self.fault_type


def run_replay(
    csv_path: PathLike,
    delay_seconds: float = 0,
) -> list[ReplayResult]:
    """Replay telemetry rows sequentially through continuous EKF and print each result.

    Args:
        csv_path: Path to a telemetry CSV file.
        delay_seconds: Optional pause after each row. Must be non-negative.

    Returns:
        Results in the same order as the rows in the CSV.

    Raises:
        TypeError: If ``csv_path`` or ``delay_seconds`` has an invalid type.
        ValueError: If ``delay_seconds`` is negative or the CSV has no rows.
        FileNotFoundError, IsADirectoryError, FlightDataLoadError, or
            TelemetryValidationError: If loading or validation fails.
    """
    if not isinstance(csv_path, (str, Path)):
        raise TypeError(
            f"csv_path must be a string or pathlib.Path, got {type(csv_path).__name__}"
        )
    if not isinstance(delay_seconds, (int, float)):
        raise TypeError("delay_seconds must be a number")
    if delay_seconds < 0:
        raise ValueError("delay_seconds must be non-negative")

    telemetry = load_telemetry_csv(csv_path)
    if telemetry.empty:
        raise ValueError("Telemetry CSV contains no data rows")

    physics_model = SimplePhysicsModel()
    fault_classifier = FaultClassifier()
    mission_decision = MissionDecision()

    first_row = {str(field): value for field, value in telemetry.iloc[0].items()}
    estimator = EKFEngineStateEstimator(
        initial_state=[float(first_row[field]) for field in ("rpm", "egt", "cht")]
    )
    results: list[ReplayResult] = []

    for _, row in telemetry.iterrows():
        values = {str(field): value for field, value in row.items()}
        estimate = estimator.estimate(values)
        estimated_state = {
            "rpm": float(estimate["estimated_rpm"]),
            "egt": float(estimate["estimated_egt"]),
            "cht": float(estimate["estimated_cht"]),
        }
        expected = physics_model.predict(values)
        residuals = calculate_residuals(estimated_state, expected)
        classification = fault_classifier.classify_fault(residuals)
        decision = mission_decision.decide(
            classification["fault_type"], classification["severity"]
        )
        total_error = (
            abs(residuals["rpm_residual"]) / 20.0
            + abs(residuals["egt_residual"])
            + abs(residuals["cht_residual"])
        )
        health_score = round(max(0.0, min(100.0, 100.0 - total_error)), 1)
        result = ReplayResult(
            timestamp=str(values["timestamp"]),
            measured_values={
                field: float(values[field]) for field in ("rpm", "egt", "cht")
            },
            residuals=residuals,
            fault_type=classification["fault_type"],
            severity=classification["severity"],
            decision=decision["decision"],
            reason=decision["reason"],
            estimated_state=estimated_state,
            innovation=dict(estimate["innovation"]),
            uncertainty=dict(estimate["uncertainty"]),
            health_score=health_score,
        )
        results.append(result)
        _print_result(result)
        if delay_seconds > 0:
            time.sleep(delay_seconds)

    return results


def _print_result(result: ReplayResult) -> None:
    """Print one replay result in a human-readable format."""
    print(f"Time: {result.timestamp}")
    print(
        "Measured Values: "
        f"RPM={result.measured_values['rpm']}, "
        f"EGT={result.measured_values['egt']}, "
        f"CHT={result.measured_values['cht']}"
    )
    print(
        "Residuals: "
        f"RPM={result.residuals['rpm_residual']}, "
        f"EGT={result.residuals['egt_residual']}, "
        f"CHT={result.residuals['cht_residual']}"
    )
    print(f"Fault Type: {result.fault_type}")
    print(f"Severity: {result.severity}")
    print(f"Mission Decision: {result.decision}")
    print(f"Reason: {result.reason}")
    print()
