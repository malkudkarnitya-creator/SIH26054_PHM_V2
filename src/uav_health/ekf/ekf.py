"""A small uncertainty-aware estimator for the three engine state signals."""

from collections.abc import Mapping, Sequence
from typing import TypeAlias

import numpy as np

Measurement: TypeAlias = Mapping[str, float]
StateVector: TypeAlias = np.ndarray

_STATE_FIELDS = ("rpm", "egt", "cht")
_OUTPUT_FIELDS = ("estimated_rpm", "estimated_egt", "estimated_cht")
_DEFAULT_Q = np.diag([10.0, 10.0, 10.0])
_DEFAULT_R = np.diag([50.0, 20.0, 20.0])


class EKFResult(dict):
    """Structured uncertainty and estimation container with backward-compatible dict access."""

    _LEGACY_KEYS = (
        "estimated_rpm",
        "estimated_egt",
        "estimated_cht",
        "rpm_uncertainty",
        "egt_uncertainty",
        "cht_uncertainty",
    )

    def __init__(
        self,
        estimated_state: dict[str, float],
        innovation: dict[str, float],
        uncertainty: dict[str, float],
        covariance_trace: float,
    ) -> None:
        self.estimated_state = estimated_state
        self.innovation = innovation
        self.uncertainty = uncertainty
        self.covariance_trace = covariance_trace
        legacy_data = {
            "estimated_rpm": float(estimated_state["rpm"]),
            "estimated_egt": float(estimated_state["egt"]),
            "estimated_cht": float(estimated_state["cht"]),
            "rpm_uncertainty": float(uncertainty["rpm"]),
            "egt_uncertainty": float(uncertainty["egt"]),
            "cht_uncertainty": float(uncertainty["cht"]),
        }
        super().__init__(legacy_data)

    def __getitem__(self, key: str) -> object:
        if key == "estimated_state":
            return self.estimated_state
        if key == "innovation":
            return self.innovation
        if key == "uncertainty":
            return self.uncertainty
        if key == "covariance_trace":
            return self.covariance_trace
        return super().__getitem__(key)

    def get(self, key: str, default: object = None) -> object:
        if key == "estimated_state":
            return self.estimated_state
        if key == "innovation":
            return self.innovation
        if key == "uncertainty":
            return self.uncertainty
        if key == "covariance_trace":
            return self.covariance_trace
        return super().get(key, default)

    def __contains__(self, key: object) -> bool:
        if key in ("estimated_state", "innovation", "uncertainty", "covariance_trace"):
            return True
        return super().__contains__(key)

    def to_dict(self) -> dict[str, object]:
        """Return a plain dictionary containing both structured and flat fields."""
        return {
            "estimated_state": dict(self.estimated_state),
            "innovation": dict(self.innovation),
            "uncertainty": dict(self.uncertainty),
            "covariance_trace": float(self.covariance_trace),
            **dict(self),
        }


class EKFEngineStateEstimator:
    """Stateful, uncertainty-aware estimator for RPM, EGT, and CHT.

    Maintains continuous state vector, covariance propagation, innovation residuals,
    and covariance trace across streaming telemetry frames.
    """

    def __init__(
        self,
        initial_state: Sequence[float] | None = None,
        initial_covariance: Sequence[Sequence[float]] | None = None,
        process_noise: Sequence[Sequence[float]] | None = None,
        measurement_noise: Sequence[Sequence[float]] | None = None,
    ) -> None:
        self.F = np.eye(3)
        self.H = np.eye(3)
        self.Q = self._matrix_or_default(process_noise, _DEFAULT_Q, "process_noise")
        self.R = self._matrix_or_default(
            measurement_noise, _DEFAULT_R, "measurement_noise"
        )
        self.state = self._vector_or_default(initial_state, np.zeros(3), "initial_state")
        self.covariance = self._matrix_or_default(
            initial_covariance, np.eye(3) * 100.0, "initial_covariance"
        )
        self._validate_covariance(self.covariance, "initial_covariance")

        # Persistent history tracking across frames
        self.previous_state: StateVector | None = None
        self.previous_covariance: StateVector | None = None
        self.innovation_vector: StateVector = np.zeros(3)

    def reset(
        self,
        initial_state: Sequence[float] | None = None,
        initial_covariance: Sequence[Sequence[float]] | None = None,
    ) -> None:
        """Reset the estimator state and covariance to start a new flight session."""
        self.state = self._vector_or_default(initial_state, np.zeros(3), "initial_state")
        self.covariance = self._matrix_or_default(
            initial_covariance, np.eye(3) * 100.0, "initial_covariance"
        )
        self._validate_covariance(self.covariance, "initial_covariance")
        self.previous_state = None
        self.previous_covariance = None
        self.innovation_vector = np.zeros(3)

    def predict(self) -> EKFResult:
        """Advance the state and covariance with the process model."""
        self.previous_state = self.state.copy()
        self.previous_covariance = self.covariance.copy()
        self.state = self.F @ self.state
        self.covariance = self.F @ self.covariance @ self.F.T + self.Q
        return self._output()

    def update(self, measurement: Measurement) -> EKFResult:
        """Fuse one complete telemetry measurement into the continuous state."""
        observed = self._measurement_vector(measurement)
        innovation_covariance = self.H @ self.covariance @ self.H.T + self.R
        gain = self.covariance @ self.H.T @ np.linalg.inv(innovation_covariance)
        innovation = observed - self.H @ self.state
        self.innovation_vector = innovation.copy()
        self.state = self.state + gain @ innovation
        identity = np.eye(3)
        self.covariance = (identity - gain @ self.H) @ self.covariance
        self.covariance = (self.covariance + self.covariance.T) / 2.0
        return self._output()

    def estimate(self, measurement: Measurement) -> EKFResult:
        """Predict forward and update state from incoming telemetry measurement."""
        self.predict()
        return self.update(measurement)

    @property
    def covariance_trace(self) -> float:
        """Trace of current state covariance matrix (overall uncertainty)."""
        return float(np.trace(self.covariance))

    @property
    def uncertainty(self) -> dict[str, float]:
        """Variance diagonal for RPM, EGT, and CHT states."""
        return {
            "rpm": float(self.covariance[0, 0]),
            "egt": float(self.covariance[1, 1]),
            "cht": float(self.covariance[2, 2]),
        }

    @property
    def innovation(self) -> dict[str, float]:
        """Most recent innovation residual (measured minus predicted)."""
        return {
            "rpm": float(self.innovation_vector[0]),
            "egt": float(self.innovation_vector[1]),
            "cht": float(self.innovation_vector[2]),
        }

    def _output(self) -> EKFResult:
        estimated_state = {
            "rpm": float(self.state[0]),
            "egt": float(self.state[1]),
            "cht": float(self.state[2]),
        }
        return EKFResult(
            estimated_state=estimated_state,
            innovation=self.innovation,
            uncertainty=self.uncertainty,
            covariance_trace=self.covariance_trace,
        )

    @staticmethod
    def _measurement_vector(measurement: Measurement) -> StateVector:
        if not isinstance(measurement, Mapping):
            raise TypeError(
                f"measurement must be a mapping, got {type(measurement).__name__}"
            )
        missing = [field for field in _STATE_FIELDS if field not in measurement]
        if missing:
            raise ValueError(f"measurement is missing required fields: {missing}")
        try:
            values = np.asarray([float(measurement[field]) for field in _STATE_FIELDS])
        except (TypeError, ValueError) as error:
            raise ValueError("measurement values must be numeric") from error
        if not np.all(np.isfinite(values)):
            raise ValueError("measurement values must be finite")
        return values

    @staticmethod
    def _vector_or_default(
        values: Sequence[float] | None, default: StateVector, name: str
    ) -> StateVector:
        if values is None:
            return default.copy()
        try:
            vector = np.asarray(values, dtype=float)
        except (TypeError, ValueError) as error:
            raise ValueError(f"{name} must contain numeric values") from error
        if vector.shape != (3,) or not np.all(np.isfinite(vector)):
            raise ValueError(f"{name} must contain exactly three finite values")
        return vector.copy()

    @staticmethod
    def _matrix_or_default(
        values: Sequence[Sequence[float]] | None,
        default: StateVector,
        name: str,
    ) -> StateVector:
        if values is None:
            return default.copy()
        try:
            matrix = np.asarray(values, dtype=float)
        except (TypeError, ValueError) as error:
            raise ValueError(f"{name} must contain numeric values") from error
        if matrix.shape != (3, 3) or not np.all(np.isfinite(matrix)):
            raise ValueError(f"{name} must be a finite 3x3 matrix")
        return matrix.copy()

    @staticmethod
    def _validate_covariance(matrix: StateVector, name: str) -> None:
        if not np.allclose(matrix, matrix.T) or np.any(np.diag(matrix) < 0):
            raise ValueError(f"{name} must be symmetric with non-negative diagonal")
