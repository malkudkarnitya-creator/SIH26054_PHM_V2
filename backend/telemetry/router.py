import asyncio
from typing import List, Optional

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from .generator import TelemetryGenerator
from .models import TelemetryReading


def create_telemetry_router(
    generator: Optional[TelemetryGenerator] = None,
) -> APIRouter:
    telemetry = generator or TelemetryGenerator()
    router = APIRouter(prefix="/telemetry", tags=["telemetry"])

    @router.get("/current", response_model=TelemetryReading)
    def current_reading() -> TelemetryReading:
        return telemetry.generate()

    @router.get("/history", response_model=List[TelemetryReading])
    def reading_history(
        limit: int = Query(default=100, ge=1, le=500, description="Number of recent readings (1-500)."),
    ) -> List[TelemetryReading]:
        return telemetry.recent(limit)

    @router.websocket("/stream")
    async def stream_readings(websocket: WebSocket) -> None:
        try:
            await websocket.accept()
            while True:
                await websocket.send_json(telemetry.generate().dict())
                await asyncio.sleep(telemetry.config.sample_interval_seconds)
        except WebSocketDisconnect:
            return

    return router


telemetry_router = create_telemetry_router()