"""Deterministic mission decisions for classified engine faults."""

from typing import Final, TypeAlias

DecisionResult: TypeAlias = dict[str, str]

_VALID_FAULT_TYPES: Final[frozenset[str]] = frozenset(
    {
        "HEALTHY",
        "SENSOR_FAULT",
        "COOLING_ISSUE",
        "ENGINE_DEGRADATION",
    }
)
_VALID_SEVERITIES: Final[frozenset[str]] = frozenset({"LOW", "MEDIUM", "HIGH"})


class MissionDecisionInputError(ValueError):
    """Raised when a fault type or severity is invalid."""


class MissionDecision:
    """Map fault classifications to deterministic mission actions."""

    def decide(self, fault_type: str, severity: str) -> DecisionResult:
        """Return a mission decision and explanation for a fault classification.

        Args:
            fault_type: One of the supported fault classification values.
            severity: One of ``LOW``, ``MEDIUM``, or ``HIGH``.

        Returns:
            A mapping containing ``decision`` and ``reason``.

        Raises:
            TypeError: If either argument is not a string.
            MissionDecisionInputError: If either argument is unsupported.
        """
        self._validate_inputs(fault_type, severity)

        if fault_type == "HEALTHY":
            return {
                "decision": "CONTINUE",
                "reason": "No engine fault detected.",
            }
        if fault_type == "SENSOR_FAULT":
            if severity == "LOW":
                return {
                    "decision": "CONTINUE",
                    "reason": "Low-severity sensor fault; continue the mission.",
                }
            return {
                "decision": "MONITOR",
                "reason": "Sensor fault requires increased monitoring.",
            }
        if fault_type == "COOLING_ISSUE":
            if severity == "LOW":
                return {
                    "decision": "DERATE",
                    "reason": "Low-severity cooling issue; reduce engine load.",
                }
            return {
                "decision": "DIVERT",
                "reason": "Cooling issue severity requires mission diversion.",
            }

        if severity == "LOW":
            return {
                "decision": "DERATE",
                "reason": "Low-severity engine degradation; reduce engine load.",
            }
        return {
            "decision": "DIVERT",
            "reason": "Engine degradation severity requires mission diversion.",
        }

    @staticmethod
    def _validate_inputs(fault_type: str, severity: str) -> None:
        if not isinstance(fault_type, str) or not isinstance(severity, str):
            raise TypeError("fault_type and severity must be strings")
        if fault_type not in _VALID_FAULT_TYPES:
            raise MissionDecisionInputError(
                f"Unsupported fault_type: {fault_type!r}"
            )
        if severity not in _VALID_SEVERITIES:
            raise MissionDecisionInputError(f"Unsupported severity: {severity!r}")
