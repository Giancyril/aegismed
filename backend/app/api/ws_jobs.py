import json
import asyncio
from typing import Dict, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["WebSocket Streaming"])

class JobConnectionManager:
    """Manages active WebSocket connections subscribed to inference job updates."""
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, job_id: str, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            if job_id not in self.active_connections:
                self.active_connections[job_id] = []
            self.active_connections[job_id].append(websocket)

    async def disconnect(self, job_id: str, websocket: WebSocket):
        async with self._lock:
            if job_id in self.active_connections:
                if websocket in self.active_connections[job_id]:
                    self.active_connections[job_id].remove(websocket)
                if not self.active_connections[job_id]:
                    del self.active_connections[job_id]

    async def broadcast_job_event(self, job_id: str, event_data: dict):
        connections = []
        async with self._lock:
            if job_id in self.active_connections:
                connections = list(self.active_connections[job_id])
        for conn in connections:
            try:
                await conn.send_text(json.dumps(event_data))
            except Exception:
                await self.disconnect(job_id, conn)

ws_manager = JobConnectionManager()

@router.websocket("/ws/jobs/{job_id}")
async def websocket_job_progress(websocket: WebSocket, job_id: str):
    await ws_manager.connect(job_id, websocket)
    try:
        await websocket.send_text(json.dumps({
            "type": "connected",
            "job_id": job_id,
            "message": f"Connected to live stream for job {job_id}"
        }))
        while True:
            data = await websocket.receive_text()
            try:
                parsed = json.loads(data)
                if parsed.get("action") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong", "job_id": job_id}))
            except Exception:
                pass
    except WebSocketDisconnect:
        await ws_manager.disconnect(job_id, websocket)

_main_loop = None

def set_main_loop(loop):
    global _main_loop
    _main_loop = loop

def notify_job_stage(job_id: str, stage: str, progress: int, message: str, metrics: dict = None, error: str = None):
    """Thread-safe synchronous bridge to broadcast job events to active WebSocket clients."""
    event = {
        "type": "stage_update",
        "job_id": job_id,
        "stage": stage,
        "progress": progress,
        "message": message,
        "metrics": metrics or {},
        "error": error
    }
    try:
        loop = None
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = _main_loop

        if loop and loop.is_running():
            asyncio.run_coroutine_threadsafe(ws_manager.broadcast_job_event(job_id, event), loop)
        else:
            # If no running loop, create one temporarily
            new_loop = asyncio.new_event_loop()
            new_loop.run_until_complete(ws_manager.broadcast_job_event(job_id, event))
            new_loop.close()
    except Exception as exc:
        print(f"[WebSocket] Event dispatch notice: {exc}")
