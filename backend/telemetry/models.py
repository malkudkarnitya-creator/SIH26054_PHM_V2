from pydantic import BaseModel, Field


class TelemetryReading(BaseModel):
    engine_id: str = Field(description="Identifier of the simulated engine.")
    sequence: int = Field(description="Increasing reading sequence number.")
    timestamp: str = Field(description="Timezone-aware UTC timestamp in ISO 8601 format.")
    rpm: float = Field(description="Engine speed in revolutions per minute.")
    cht: float = Field(description="Cylinder-head temperature in degrees Celsius.")
    egt: float = Field(description="Exhaust-gas temperature in degrees Celsius.")
    fuel_flow: float = Field(description="Fuel flow in litres per hour.")
    vibration: float = Field(description="Vibration in metres per second squared RMS.")