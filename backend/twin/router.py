"""Version 2 routes. Legacy HTTP contracts remain in backend.api.main."""
import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import APIRouter, HTTPException, Query, Request, WebSocket, WebSocketDisconnect

from .schemas import Controls, Telemetry, WhatIf
from .service import TwinService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v2", tags=["Digital Twin V2"])


@asynccontextmanager
async def lifespan(app):
    service = TwinService(os.getenv("TWIN_DATABASE", "data/twin.sqlite3"))
    app.state.twin = service
    app.state.twin_error = None

    async def loop():
        while True:
            try:
                await asyncio.to_thread(service.tick)
                app.state.twin_error = None
            except Exception:
                logger.exception("Digital twin tick failed")
                app.state.twin_error = "Simulation or persistence unavailable"
            await asyncio.sleep(1)

    task = asyncio.create_task(loop())
    try:
        yield
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
        service.close()


@router.get("/health")
def health(request: Request):
    if request.app.state.twin_error:
        raise HTTPException(503, request.app.state.twin_error)
    return {"status": "ok", "version": "2.0.0", "engine_id": "VAYU-01"}


@router.get("/twin")
def twin(request: Request):
    return request.app.state.twin.snapshot()


@router.get("/history")
def history(request: Request, limit: int = Query(default=180, ge=1, le=3600)):
    return {"history": request.app.state.twin.history(limit)}


@router.get("/fleet")
def fleet(request: Request):
    return request.app.state.twin.fleet_snapshot()


@router.get("/missions")
def missions(request: Request, limit: int = Query(default=24, ge=1, le=200)):
    return {"missions": request.app.state.twin.missions(limit)}


@router.get("/fault-history")
def fault_history(request: Request, limit: int = Query(default=180, ge=1, le=3600)):
    return {"fault_history": request.app.state.twin.fault_history(limit)}


@router.get("/missions/{mission_id}/replay")
def mission_replay(mission_id: str, request: Request):
    # The time-indexed snapshot stream is directly consumable by existing replay controls.
    return {"mission_id": mission_id, "history": request.app.state.twin.history(3600)}


@router.post("/controls")
def controls(body: Controls, request: Request):
    return request.app.state.twin.configure(body)


@router.post("/telemetry")
def telemetry(body: Telemetry, request: Request):
    try:
        return request.app.state.twin.ingest(body)
    except ValueError as error:
        raise HTTPException(409, str(error)) from error


@router.post("/what-if")
def what_if(body: WhatIf, request: Request):
    return request.app.state.twin.what_if(body)


@router.get("/report")
def report(request: Request):
    service = request.app.state.twin
    with service.lock:
        return {"report_type": "SIH26054 engine condition report", "snapshot": service.snapshot(),
                "history": service.history(180),
                "validation_status": "Synthetic prototype. No fleet-calibrated RUL or failure probabilities."}


@router.websocket("/stream")
async def stream(socket: WebSocket):
    # Browser WebSocket requests bypass HTTP CORS; enforce the origin here too.
    allowed = os.getenv("TWIN_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173").split(",")
    origin = socket.headers.get("origin")
    if origin and "*" not in allowed and origin not in allowed:
        await socket.close(code=1008)
        return
    await socket.accept()
    try:
        while True:
            await socket.send_json(socket.app.state.twin.snapshot())
            await asyncio.sleep(1)
    except (WebSocketDisconnect, RuntimeError):
        pass
