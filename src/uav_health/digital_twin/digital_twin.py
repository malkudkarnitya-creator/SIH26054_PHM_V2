"""Simple, deterministic engine-behaviour model for the Phase-1 MVP."""

from dataclasses import dataclass
from math import isfinite


from uav_health.physics_model.engine_model import UnifiedEngineModel, UnifiedEngineState


@dataclass(frozen=True)
class EngineState(UnifiedEngineState):
    """Inputs used by the digital twin, inheriting validated operating conditions."""


class DigitalTwin:
    """Predict expected RPM, EGT, and CHT using the shared unified prediction model."""

    def __init__(self, profile: str = "standard") -> None:
        self.profile = profile
        self._engine_model = UnifiedEngineModel(profile=profile)

    def predict_engine_state(self, state: EngineState) -> dict[str, float]:
        """Return all expected engine signals for one engine state."""
        return self._engine_model.predict_from_state(state)

    def predict_rpm(self, state: EngineState) -> float:
        """Return expected RPM, clamped to a non-negative value."""
        return self.predict_engine_state(state)["expected_rpm"]

    def predict_egt(self, state: EngineState) -> float:
        """Return expected exhaust-gas temperature."""
        return self.predict_engine_state(state)["expected_egt"]

    def predict_cht(self, state: EngineState) -> float:
        """Return expected cylinder-head temperature."""
        return self.predict_engine_state(state)["expected_cht"]


MiniDigitalTwin = DigitalTwin
