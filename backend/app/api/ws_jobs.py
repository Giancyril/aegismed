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
