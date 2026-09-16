"""Residual generation for measured and physics-model engine values."""

from collections.abc import Mapping
from typing import TypeAlias

TelemetryValues: TypeAlias = Mapping[str, float]
ResidualValues: TypeAlias = dict[str, float]

_MEASURED_FIELDS: tuple[str, ...] = ("rpm", "egt", "cht")
_EXPECTED_FIELDS: tuple[str, ...] = (
    "expected_rpm",
    "expected_egt",
    "expected_cht",
)


class ResidualInputError(ValueError):
    """Raised when measured or expected values are incomplete or invalid."""


def calculate_residuals(
    measured: TelemetryValues,
    expected: TelemetryValues,
) -> ResidualValues:
    """Calculate measured-minus-expected engine residuals.

    Args:
        measured: Mapping containing ``rpm``, ``egt``, and ``cht`` readings.
        expected: Mapping containing ``expected_rpm``, ``expected_egt``, and
            ``expected_cht`` values from the physics model.

    Returns:
        A mapping containing ``rpm_residual``, ``egt_residual``, and
        ``cht_residual``.

    Raises:
        TypeError: If either input is not a mapping.
        ResidualInputError: If a required value is missing or non-numeric.
    """
    _validate_mapping("measured", measured)
    _validate_mapping("expected", expected)

    missing_measured = [
        field for field in _MEASURED_FIELDS if field not in measured
    ]
    missing_expected = [
        field for field in _EXPECTED_FIELDS if field not in expected
    ]
    if missing_measured or missing_expected:
        missing = [
            *("measured." + field for field in missing_measured),
            *("expected." + field for field in missing_expected),
        ]
        raise ResidualInputError(f"Missing required values: {missing}")

    try:
        measured_rpm = float(measured["rpm"])
        measured_egt = float(measured["egt"])
        measured_cht = float(measured["cht"])
        expected_rpm = float(expected["expected_rpm"])
        expected_egt = float(expected["expected_egt"])
        expected_cht = float(expected["expected_cht"])
    except (TypeError, ValueError) as error:
        raise ResidualInputError("All residual inputs must be numeric") from error

    return {
        "rpm_residual": measured_rpm - expected_rpm,
        "egt_residual": measured_egt - expected_egt,
        "cht_residual": measured_cht - expected_cht,
    }


def _validate_mapping(name: str, values: object) -> None:
    if not isinstance(values, Mapping):
        raise TypeError(f"{name} must be a mapping, got {type(values).__name__}")
