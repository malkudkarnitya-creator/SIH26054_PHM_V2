"""Classification metrics for validating UAV fault predictions."""

from collections.abc import Sequence
from typing import Final, TypeAlias

MetricResult: TypeAlias = dict[str, object]
ClassMetrics: TypeAlias = dict[str, float]
ConfusionMatrix: TypeAlias = dict[str, dict[str, int]]

SUPPORTED_CLASSES: Final[tuple[str, ...]] = (
    "HEALTHY",
    "SENSOR_FAULT",
    "COOLING_ISSUE",
    "ENGINE_DEGRADATION",
)
_SUPPORTED_CLASS_SET: Final[frozenset[str]] = frozenset(SUPPORTED_CLASSES)


class ValidationMetricsInputError(ValueError):
    """Raised when classification metric inputs are invalid."""


def calculate_metrics(
    actual_faults: Sequence[str],
    predicted_faults: Sequence[str],
) -> MetricResult:
    """Calculate accuracy, per-class precision/recall, and confusion matrix.

    Args:
        actual_faults: Ground-truth fault labels.
        predicted_faults: Predicted fault labels in the same order.

    Returns:
        A mapping containing ``accuracy``, ``precision``, ``recall``, and a
        confusion matrix keyed by actual then predicted class.

    Raises:
        TypeError: If either input is not a sequence of labels.
        ValidationMetricsInputError: If inputs are empty, lengths differ, or
            contain unsupported labels.
    """
    _validate_inputs(actual_faults, predicted_faults)

    confusion_matrix: ConfusionMatrix = {
        actual: {predicted: 0 for predicted in SUPPORTED_CLASSES}
        for actual in SUPPORTED_CLASSES
    }
    for actual, predicted in zip(actual_faults, predicted_faults):
        confusion_matrix[actual][predicted] += 1

    total = len(actual_faults)
    correct = sum(
        confusion_matrix[label][label] for label in SUPPORTED_CLASSES
    )
    precision: ClassMetrics = {}
    recall: ClassMetrics = {}
    for label in SUPPORTED_CLASSES:
        true_positive = confusion_matrix[label][label]
        predicted_positive = sum(
            confusion_matrix[actual][label] for actual in SUPPORTED_CLASSES
        )
        actual_positive = sum(confusion_matrix[label].values())
        precision[label] = (
            true_positive / predicted_positive if predicted_positive else 0.0
        )
        recall[label] = (
            true_positive / actual_positive if actual_positive else 0.0
        )

    return {
        "accuracy": correct / total,
        "precision": precision,
        "recall": recall,
        "confusion_matrix": confusion_matrix,
    }


def _validate_inputs(
    actual_faults: Sequence[str],
    predicted_faults: Sequence[str],
) -> None:
    if isinstance(actual_faults, (str, bytes)) or not isinstance(
        actual_faults, Sequence
    ):
        raise TypeError("actual_faults must be a sequence of labels")
    if isinstance(predicted_faults, (str, bytes)) or not isinstance(
        predicted_faults, Sequence
    ):
        raise TypeError("predicted_faults must be a sequence of labels")
    if not actual_faults or not predicted_faults:
        raise ValidationMetricsInputError("fault label inputs must not be empty")
    if len(actual_faults) != len(predicted_faults):
        raise ValidationMetricsInputError(
            "actual_faults and predicted_faults must have the same length"
        )

    for name, labels in (
        ("actual_faults", actual_faults),
        ("predicted_faults", predicted_faults),
    ):
        invalid = [
            label
            for label in labels
            if not isinstance(label, str) or label not in _SUPPORTED_CLASS_SET
        ]
        if invalid:
            raise ValidationMetricsInputError(
                f"{name} contains unsupported labels: {invalid}"
            )
