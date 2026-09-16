"""Run fault-injection experiments through the health-monitoring pipeline."""

from collections.abc import Sequence
from typing import TypeAlias

from uav_health.ekf import EKFEngineStateEstimator
from uav_health.fault_classifier import FaultClassifier
from uav_health.fault_injection import inject_fault
from uav_health.mission_decision import MissionDecision
from uav_health.physics_model import SimplePhysicsModel
from uav_health.residual_generator import calculate_residuals
from uav_health.validation_metrics import calculate_metrics

Telemetry: TypeAlias = dict[str, float]
ExperimentDetail: TypeAlias = dict[str, object]
ExperimentResult: TypeAlias = dict[str, object]

_GROUND_TRUTH: dict[str, str] = {
    "NO_FAULT": "HEALTHY",
    "RPM_SENSOR_BIAS": "SENSOR_FAULT",
    "EGT_SENSOR_BIAS": "SENSOR_FAULT",
    "CHT_SENSOR_BIAS": "COOLING_ISSUE",
    "ENGINE_DEGRADATION": "ENGINE_DEGRADATION",
    "COOLING_FAILURE": "COOLING_ISSUE",
}


class ExperimentInputError(ValueError):
    """Raised when experiment inputs are invalid or empty."""


def run_experiments(
    healthy_telemetry: Telemetry,
    experiments: Sequence[tuple[str, float]],
) -> ExperimentResult:
    """Run fault-injection experiments and calculate validation metrics.

    Args:
        healthy_telemetry: Baseline telemetry containing ``rpm``, ``egt``,
            ``cht``, ``throttle``, and ``altitude``.
        experiments: Non-empty sequence of ``(fault_type, magnitude)`` pairs.

    Returns:
        A structured result containing aggregate metrics and per-experiment
        predicted labels, severity, and mission decisions.

    Raises:
        TypeError: If telemetry or experiments have invalid container types.
        ExperimentInputError: If an experiment is malformed, empty, or uses
            an unsupported fault type.
    """
    if not isinstance(healthy_telemetry, dict):
        raise TypeError("healthy_telemetry must be a dict")
    if isinstance(experiments, (str, bytes)) or not isinstance(experiments, Sequence):
        raise TypeError("experiments must be a sequence of (fault_type, magnitude) pairs")
    if not experiments:
        raise ExperimentInputError("experiments must not be empty")

    model = SimplePhysicsModel()
    classifier = FaultClassifier()
    mission_decision = MissionDecision()
    actual_labels: list[str] = []
    predicted_labels: list[str] = []
    details: list[ExperimentDetail] = []

    for experiment in experiments:
        if (
            not isinstance(experiment, tuple)
            or len(experiment) != 2
            or not isinstance(experiment[0], str)
        ):
            raise ExperimentInputError(
                "Each experiment must be a (fault_type, magnitude) tuple"
            )
        fault_type, magnitude = experiment
        if fault_type not in _GROUND_TRUTH:
            raise ExperimentInputError(f"Unsupported fault type: {fault_type!r}")

        injected = inject_fault(healthy_telemetry, fault_type, magnitude)
        estimator = EKFEngineStateEstimator(
            initial_state=[float(injected[field]) for field in ("rpm", "egt", "cht")]
        )
        estimate = estimator.estimate(injected)
        estimated_state = {
            "rpm": float(estimate["estimated_rpm"]),
            "egt": float(estimate["estimated_egt"]),
            "cht": float(estimate["estimated_cht"]),
        }
        expected = model.predict(injected)
        residuals = calculate_residuals(estimated_state, expected)
        classification = classifier.classify_fault(residuals)
        decision = mission_decision.decide(
            classification["fault_type"], classification["severity"]
        )

        actual_labels.append(_GROUND_TRUTH[fault_type])
        predicted_labels.append(classification["fault_type"])
        details.append(
            {
                "fault_type": fault_type,
                "magnitude": magnitude,
                "predicted_fault": classification["fault_type"],
                "severity": classification["severity"],
                "decision": decision["decision"],
            }
        )

    metrics = calculate_metrics(actual_labels, predicted_labels)
    return {
        "total_experiments": len(details),
        "accuracy": metrics["accuracy"],
        "precision": metrics["precision"],
        "recall": metrics["recall"],
        "confusion_matrix": metrics["confusion_matrix"],
        "experiment_details": details,
    }
