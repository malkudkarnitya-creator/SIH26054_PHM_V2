"""HTTP contracts; requests reject invalid data before it enters the PHM engine."""

from typing import Annotated, Literal
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator, model_validator

Fault = Literal["HEALTHY", "SENSOR_FAULT", "COOLING_ISSUE", "ENGINE_DEGRADATION"]
Severity = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
Decision = Literal["CONTINUE_MISSION", "MONITOR", "REDUCE_POWER", "RETURN_TO_BASE"]
ExperimentFault = Literal["RPM_SENSOR_BIAS", "EGT_SENSOR_BIAS", "CHT_SENSOR_BIAS",
                          "ENGINE_DEGRADATION", "COOLING_FAILURE", "NO_FAULT"]
Score = Annotated[float, Field(ge=0, le=100)]
Rate = Annotated[float, Field(ge=0, le=1)]


class Contract(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)


class TelemetryRequest(Contract):
    timestamp: AwareDatetime | None = None
    @field_validator("timestamp", mode="before")
    @classmethod
    def timestamp_is_text(cls, value):
        if value is not None and not isinstance(value, str):
            raise ValueError("timestamp must be an ISO date/time string with a timezone")
        return value

    rpm: float = Field(ge=0, strict=True)
    egt: float = Field(strict=True)
    cht: float = Field(strict=True)
    throttle: float = Field(ge=0, le=100, strict=True)
    altitude: float = Field(default=0, strict=True)
    ambient_temperature: float = Field(default=25, strict=True)
    health_factor: float = Field(default=1, ge=0.5, le=1, strict=True)
    reset_filter: bool = Field(default=False, strict=True)


class ReplayTelemetry(TelemetryRequest):
    # Required for replay, optional for single-snapshot analysis.
    timestamp: AwareDatetime


class ReplayRequest(Contract):
    telemetry: list[ReplayTelemetry] = Field(min_length=1, max_length=10000)

    @model_validator(mode="after")
    def chronological(self):
        if any(right.timestamp <= left.timestamp for left, right in zip(self.telemetry, self.telemetry[1:])):
            raise ValueError("Replay timestamps must be in increasing order.")
        return self


class ExperimentRequest(Contract):
    fault_type: ExperimentFault
    magnitude: Score


class Vector(Contract):
    rpm: float
    egt: float
    cht: float


class AnalysisResponse(Contract):
    health_score: Score
    risk_score: Score
    fault_type: Fault
    fault: Fault
    severity: Severity
    confidence: Score
    decision: Decision
    expected: Vector
    estimated: Vector
    residuals: Vector
    explanation: str
    estimated_state: Vector | None = None
    innovation: Vector | None = None
    uncertainty: Vector | None = None
    covariance_trace: float | None = Field(default=None, ge=0)


class DemoResponse(Contract):
    telemetry: list[ReplayTelemetry]


class ReplayFrame(Contract):
    timestamp: AwareDatetime
    rpm: float
    egt: float
    cht: float
    health_score: Score
    risk_score: Score
    fault: Fault
    severity: Severity
    decision: Decision
    residuals: Vector
    uncertainty: Vector


class ReplayResponse(Contract):
    timeline: list[ReplayFrame] = Field(min_length=1)


class HistoryPoint(Contract):
    timestamp: AwareDatetime
    value: float


class HistoryResponse(Contract):
    health_history: list[HistoryPoint]
    risk_history: list[HistoryPoint]
    residual_history: list[HistoryPoint]
    uncertainty_history: list[HistoryPoint]


class ValidationResponse(Contract):
    accuracy: Rate
    precision: Rate
    recall: Rate
    f1_score: Rate
    confusion_matrix: list[list[Annotated[int, Field(ge=0)]]]


class ExperimentDetail(Contract):
    fault_type: ExperimentFault
    magnitude: Score
    predicted_fault: Fault
    severity: Severity
    decision: Literal["CONTINUE", "MONITOR", "DERATE", "DIVERT"]


class ExperimentMetrics(Contract):
    total_experiments: int = Field(gt=0)
    accuracy: Rate
    precision: dict[Fault, Rate]
    recall: dict[Fault, Rate]
    confusion_matrix: dict[Fault, dict[Fault, Annotated[int, Field(ge=0)]]]
    experiment_details: list[ExperimentDetail]


class ExperimentResponse(Contract):
    metrics: ExperimentMetrics
    results: list[ExperimentDetail]


class ResetResponse(Contract):
    status: str


LiveFaultClassification = Literal["HEALTHY", "COOLING_ISSUE", "ENGINE_DEGRADATION"]
MissionRecommendation = Literal["CONTINUE MISSION", "REDUCE POWER", "RETURN TO BASE"]


class LiveTelemetryValues(Contract):
    """Validated sensor values and their operating envelopes."""

    rpm: float = Field(ge=1800, le=2800)
    egt: float = Field(ge=500, le=850)
    cht: float = Field(ge=120, le=250)
    fuel_flow: float = Field(ge=5, le=40)
    vibration: float = Field(ge=0.5, le=6.0)
    oil_temperature: float = Field(ge=60, le=120)


class LiveTelemetry(Contract):
    """Validated response contract for a live engine telemetry sample."""

    telemetry: LiveTelemetryValues
    fault_classification: LiveFaultClassification
    health_score: Score
    mission_recommendation: MissionRecommendation
    timestamp: AwareDatetime
