import pytest

from uav_health.validation_metrics import calculate_metrics


def test_perfect_classification() -> None:
    labels = ["HEALTHY", "SENSOR_FAULT", "COOLING_ISSUE", "ENGINE_DEGRADATION"]

    result = calculate_metrics(labels, labels)

    assert result["accuracy"] == 1.0
    assert all(value == 1.0 for value in result["precision"].values())
    assert all(value == 1.0 for value in result["recall"].values())
    assert all(
        result["confusion_matrix"][label][label] == 1 for label in labels
    )


def test_partial_classification() -> None:
    actual = ["HEALTHY", "HEALTHY", "SENSOR_FAULT", "COOLING_ISSUE"]
    predicted = ["HEALTHY", "SENSOR_FAULT", "SENSOR_FAULT", "HEALTHY"]

    result = calculate_metrics(actual, predicted)

    assert result["accuracy"] == 0.5
    assert result["precision"]["HEALTHY"] == pytest.approx(0.5)
    assert result["precision"]["SENSOR_FAULT"] == pytest.approx(1 / 2)
    assert result["recall"]["HEALTHY"] == 0.5
    assert result["recall"]["SENSOR_FAULT"] == 1.0
    assert result["confusion_matrix"]["HEALTHY"]["SENSOR_FAULT"] == 1
    assert result["confusion_matrix"]["COOLING_ISSUE"]["HEALTHY"] == 1


@pytest.mark.parametrize(
    ("actual", "predicted"),
    [
        (["UNKNOWN"], ["HEALTHY"]),
        (["HEALTHY"], ["UNKNOWN"]),
        (["HEALTHY"], []),
    ],
)
def test_invalid_labels_or_lengths_raise(
    actual: list[str],
    predicted: list[str],
) -> None:
    with pytest.raises(ValueError):
        calculate_metrics(actual, predicted)


def test_empty_inputs_raise() -> None:
    with pytest.raises(ValueError, match="must not be empty"):
        calculate_metrics([], [])
