"""Run the UAV engine health monitoring pipeline."""

from pathlib import Path
from typing import TypeAlias

import pandas as pd

from uav_health.fault_classifier import FaultClassifier
from uav_health.flight_data import load_telemetry_csv
from uav_health.ekf import EKFEngineStateEstimator
from uav_health.digital_twin import DigitalTwin, EngineState
from uav_health.mission_decision import MissionDecision
from uav_health.physics_model import SimplePhysicsModel
from uav_health.residual_generator import calculate_residuals

PathLike: TypeAlias = str | Path
PipelineResult: TypeAlias = dict[str, str]


def run_pipeline(csv_file: PathLike) -> PipelineResult:
    """Run telemetry through continuous EKF, unified prediction, residual, fault, and mission stages.

    For a CSV containing multiple telemetry rows, the EKF filter is updated sequentially
    across all frames, and the latest converged frame is used for mission status.

    Args:
        csv_file: Path to a validated flight telemetry CSV file.

    Returns:
        A mapping containing ``fault_type``, ``severity``, ``decision``, and
        ``reason``.

    Raises:
        TypeError: If ``csv_file`` is not a string or ``Path``.
        ValueError: If the CSV contains no telemetry rows.
        FileNotFoundError, IsADirectoryError, FlightDataLoadError, or
            TelemetryValidationError: If loading or validation fails.
    """
    if not isinstance(csv_file, (str, Path)):
        raise TypeError(
            f"csv_file must be a string or pathlib.Path, got {type(csv_file).__name__}"
        )

    telemetry = load_telemetry_csv(csv_file)
    if telemetry.empty:
        raise ValueError("Telemetry CSV contains no data rows")

    first_row = _row_to_numeric_mapping(telemetry.iloc[0])
    estimator = EKFEngineStateEstimator(
        initial_state=[float(first_row[field]) for field in ("rpm", "egt", "cht")]
    )

    last_row: dict[str, float] = first_row
    last_estimate = estimator.estimate(first_row)
    for _, series_row in telemetry.iloc[1:].iterrows():
        last_row = _row_to_numeric_mapping(series_row)
        last_estimate = estimator.estimate(last_row)

    estimated_state = {
        "rpm": float(last_estimate["estimated_rpm"]),
        "egt": float(last_estimate["estimated_egt"]),
        "cht": float(last_estimate["estimated_cht"]),
    }
    expected = _expected_values(last_row)
    residuals = calculate_residuals(estimated_state, expected)
    classification = FaultClassifier().classify_fault(residuals)
    decision = MissionDecision().decide(
        classification["fault_type"], classification["severity"]
    )

    return {
        "fault_type": classification["fault_type"],
        "severity": classification["severity"],
        "decision": decision["decision"],
        "reason": decision["reason"],
    }


def run_pipeline_with_ekf(csv_file: PathLike) -> dict[str, object]:
    """Run sequential telemetry through stateful EKF-assisted health analysis."""
    if not isinstance(csv_file, (str, Path)):
        raise TypeError(
            f"csv_file must be a string or pathlib.Path, got {type(csv_file).__name__}"
        )

    telemetry = load_telemetry_csv(csv_file)
    if telemetry.empty:
        raise ValueError("Telemetry CSV contains no data rows")

    first_row = _row_to_numeric_mapping(telemetry.iloc[0])
    estimator = EKFEngineStateEstimator(
        initial_state=[float(first_row[field]) for field in ("rpm", "egt", "cht")]
    )

    last_row: dict[str, float] = first_row
    last_estimate = estimator.estimate(first_row)
    for _, series_row in telemetry.iloc[1:].iterrows():
        last_row = _row_to_numeric_mapping(series_row)
        last_estimate = estimator.estimate(last_row)

    estimated_state = {
        "rpm": float(last_estimate["estimated_rpm"]),
        "egt": float(last_estimate["estimated_egt"]),
        "cht": float(last_estimate["estimated_cht"]),
    }
    expected = _expected_values(last_row)
    residuals = calculate_residuals(estimated_state, expected)
    classification = FaultClassifier().classify_fault(residuals)
    decision = MissionDecision().decide(
        classification["fault_type"], classification["severity"]
    )
    return {
        "fault_type": classification["fault_type"],
        "severity": classification["severity"],
        "decision": decision["decision"],
        "reason": decision["reason"],
        **last_estimate,
    }


def _row_to_numeric_mapping(row: pd.Series[object]) -> dict[str, float]:
    """Convert a telemetry row into the mapping consumed by model stages."""
    return {str(field): value for field, value in row.items()}


def _expected_values(row: dict[str, float]) -> dict[str, float]:
    """Evaluate unified engine prediction for a telemetry row."""
    return SimplePhysicsModel().predict(row)
