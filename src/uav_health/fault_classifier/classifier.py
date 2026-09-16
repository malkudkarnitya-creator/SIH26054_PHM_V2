"""Rule-based fault classification for engine residuals."""

from collections.abc import Mapping
from math import isfinite
from typing import TypeAlias

Residuals: TypeAlias = Mapping[str, float]
Classification: TypeAlias = dict[str, str]

_REQUIRED_RESIDUALS: tuple[str, ...] = (
    "rpm_residual",
    "egt_residual",
    "cht_residual",
)


class FaultClassifierInputError(ValueError):
    """Raised when residual input is missing or contains invalid values."""


class FaultClassifier:
    """Classify engine faults using deterministic residual rules."""

    NEAR_ZERO_THRESHOLD = 20.0
    LOW_SEVERITY_LIMIT = 50.0
    MEDIUM_SEVERITY_LIMIT = 300.0

    def classify_fault(self, residuals: Residuals) -> Classification:
        """Classify residuals and assign severity from total magnitude.

        Args:
            residuals: Mapping containing RPM, EGT, and CHT residuals.

        Returns:
            A mapping with ``fault_type`` and ``severity``.

        Raises:
            TypeError: If ``residuals`` is not a mapping.
            FaultClassifierInputError: If a residual is missing, non-numeric,
                or not finite.
        """
        values = self._validate_residuals(residuals)
        rpm = values["rpm_residual"]
        egt = values["egt_residual"]
        cht = values["cht_residual"]

        if rpm < -300.0 and egt > 50.0 and cht > 20.0:
            fault_type = "ENGINE_DEGRADATION"
        elif (
            cht > 20.0
            and abs(rpm) <= self.NEAR_ZERO_THRESHOLD
            and abs(egt) <= self.NEAR_ZERO_THRESHOLD
        ):
            fault_type = "COOLING_ISSUE"
        elif (
            rpm < -300.0
            and abs(egt) <= self.NEAR_ZERO_THRESHOLD
            and abs(cht) <= self.NEAR_ZERO_THRESHOLD
        ):
            fault_type = "SENSOR_FAULT"
        else:
            fault_type = "HEALTHY"

        total_magnitude = abs(rpm) + abs(egt) + abs(cht)
        return {
            "fault_type": fault_type,
            "severity": self._severity(total_magnitude),
        }

    @staticmethod
    def _validate_residuals(residuals: Residuals) -> dict[str, float]:
        if not isinstance(residuals, Mapping):
            raise TypeError(
                f"residuals must be a mapping, got {type(residuals).__name__}"
            )

        missing = [field for field in _REQUIRED_RESIDUALS if field not in residuals]
        if missing:
            raise FaultClassifierInputError(
                f"Residuals are missing required fields: {missing}"
            )

        values: dict[str, float] = {}
        for field in _REQUIRED_RESIDUALS:
            try:
                value = float(residuals[field])
            except (TypeError, ValueError) as error:
                raise FaultClassifierInputError(
                    f"Residual '{field}' must be numeric"
                ) from error
            if not isfinite(value):
                raise FaultClassifierInputError(
                    f"Residual '{field}' must be finite"
                )
            values[field] = value
        return values

    @classmethod
    def _severity(cls, total_magnitude: float) -> str:
        if total_magnitude <= cls.LOW_SEVERITY_LIMIT:
            return "LOW"
        if total_magnitude <= cls.MEDIUM_SEVERITY_LIMIT:
            return "MEDIUM"
        return "HIGH"
