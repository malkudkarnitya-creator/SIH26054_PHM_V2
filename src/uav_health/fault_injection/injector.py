"""Inject deterministic sensor and engine faults into telemetry."""

from collections.abc import Callable
from math import isfinite
from typing import TypeAlias

Telemetry: TypeAlias = dict[str, float]
FaultAdjustment: TypeAlias = Callable[[Telemetry, float], None]

_REQUIRED_FIELDS: tuple[str, ...] = ("rpm", "egt", "cht")
_SUPPORTED_FAULTS: frozenset[str] = frozenset(
    {
        "RPM_SENSOR_BIAS",
        "EGT_SENSOR_BIAS",
        "CHT_SENSOR_BIAS",
        "ENGINE_DEGRADATION",
        "COOLING_FAILURE",
        "NO_FAULT",
    }
)


def inject_fault(
    telemetry: Telemetry,
    fault_type: str,
    magnitude: float,
) -> Telemetry:
    """Return a copy of telemetry with a deterministic fault applied.

    Args:
        telemetry: Telemetry mapping containing ``rpm``, ``egt``, and ``cht``.
        fault_type: Supported fault identifier, or ``NO_FAULT``.
        magnitude: Non-negative amount to apply to the affected values.

    Returns:
        A modified copy of ``telemetry``. The input dictionary is unchanged.

    Raises:
        TypeError: If telemetry, fault type, or magnitude has an invalid type.
        ValueError: If required fields are missing, magnitude is negative or
            non-finite, or the fault type is unsupported.
    """
    if not isinstance(telemetry, dict):
        raise TypeError(f"telemetry must be a dict, got {type(telemetry).__name__}")
    if not isinstance(fault_type, str):
        raise TypeError(f"fault_type must be a string, got {type(fault_type).__name__}")

    missing_fields = [field for field in _REQUIRED_FIELDS if field not in telemetry]
    if missing_fields:
        raise ValueError(f"Telemetry is missing required fields: {missing_fields}")
    if fault_type not in _SUPPORTED_FAULTS:
        raise ValueError(f"Unsupported fault type: {fault_type!r}")

    try:
        numeric_magnitude = float(magnitude)
    except (TypeError, ValueError) as error:
        raise TypeError("magnitude must be a number") from error
    if not isfinite(numeric_magnitude) or numeric_magnitude < 0:
        raise ValueError("magnitude must be finite and non-negative")

    modified = telemetry.copy()
    try:
        modified.update(
            {
                field: float(telemetry[field])
                for field in _REQUIRED_FIELDS
            }
        )
    except (TypeError, ValueError) as error:
        raise ValueError("Telemetry RPM, EGT, and CHT values must be numeric") from error

    if fault_type == "RPM_SENSOR_BIAS":
        modified["rpm"] += numeric_magnitude
    elif fault_type == "EGT_SENSOR_BIAS":
        modified["egt"] += numeric_magnitude
    elif fault_type == "CHT_SENSOR_BIAS":
        modified["cht"] += numeric_magnitude
    elif fault_type == "ENGINE_DEGRADATION":
        modified["rpm"] -= numeric_magnitude
        modified["egt"] += numeric_magnitude
        modified["cht"] += numeric_magnitude
    elif fault_type == "COOLING_FAILURE":
        modified["cht"] += numeric_magnitude

    return modified
