"""Deterministic MVP physics model for UAV engine telemetry."""

from collections.abc import Mapping
from typing import TypeAlias

from .engine_model import predict_engine_state

Telemetry: TypeAlias = Mapping[str, float]
ExpectedValues: TypeAlias = dict[str, float]

_REQUIRED_FIELDS: tuple[str, ...] = (
    "throttle",
    "altitude",
    "rpm",
    "egt",
    "cht",
)


class PhysicsModelInputError(ValueError):
    """Raised when telemetry is missing or contains invalid input values."""


class SimplePhysicsModel:
    """Generate expected engine values from throttle and altitude using the unified engine.

    Measured ``rpm``, ``egt``, and ``cht`` are required for a complete
    telemetry record but are not used in the expected-value calculations.
    """

    def predict(self, telemetry: Telemetry) -> ExpectedValues:
        """Calculate expected RPM, EGT, and CHT for one telemetry record.

        Args:
            telemetry: Mapping containing ``throttle``, ``altitude``, ``rpm``,
                ``egt``, and ``cht`` values.

        Returns:
            A mapping containing ``expected_rpm``, ``expected_egt``, and
            ``expected_cht``.

        Raises:
            TypeError: If ``telemetry`` is not a mapping.
            PhysicsModelInputError: If a required field is missing or cannot
                be converted to a numeric value.
        """
        if not isinstance(telemetry, Mapping):
            raise TypeError(
                f"telemetry must be a mapping, got {type(telemetry).__name__}"
            )

        missing_fields = [
            field for field in _REQUIRED_FIELDS if field not in telemetry
        ]
        if missing_fields:
            raise PhysicsModelInputError(
                f"Telemetry is missing required fields: {missing_fields}"
            )

        try:
            throttle = float(telemetry["throttle"])
            altitude = float(telemetry["altitude"])
        except (TypeError, ValueError) as error:
            raise PhysicsModelInputError(
                "Telemetry fields 'throttle' and 'altitude' must be numeric"
            ) from error

        try:
            ambient = float(telemetry.get("ambient_temperature", 25.0))
            health = float(telemetry.get("health_factor", 1.0))
        except (TypeError, ValueError) as error:
            raise PhysicsModelInputError(
                "Telemetry ambient_temperature and health_factor must be numeric"
            ) from error

        return predict_engine_state(
            throttle=throttle,
            altitude=altitude,
            ambient_temperature=ambient,
            health_factor=health,
        )
