import json
import pytest
from fastapi.testclient import TestClient
from main import app
from app.api.ws_jobs import ws_manager, notify_job_stage

@pytest.fixture
def client():
    return TestClient(app)

def test_websocket_stats_endpoint(client):
    response = client.get("/ws/stats")
    assert response.status_code == 200
    data = response.json()
    assert "monitored_jobs" in data
    assert "total_clients" in data
    assert isinstance(data["total_clients"], int)

def test_websocket_connection_and_handshake(client):
    job_id = "test_job_handshake_123"
    with client.websocket_connect(f"/ws/jobs/{job_id}") as websocket:
        # Initial greeting event
        data = websocket.receive_text()
        parsed = json.loads(data)
        assert parsed["type"] == "connected"
        assert parsed["job_id"] == job_id
        assert "Connected to live stream" in parsed["message"]

def test_websocket_ping_pong(client):
    job_id = "test_job_ping_456"
    with client.websocket_connect(f"/ws/jobs/{job_id}") as websocket:
        # consume initial connection greeting
        _ = websocket.receive_text()

        # Send ping
        websocket.send_text(json.dumps({"action": "ping"}))
        reply = websocket.receive_text()
        parsed = json.loads(reply)
        assert parsed["type"] == "pong"
        assert parsed["job_id"] == job_id
        assert "timestamp" in parsed

@pytest.mark.asyncio
async def test_websocket_manager_broadcast():
    job_id = "test_job_direct_broadcast"
    class FakeWebSocket:
        def __init__(self):
            self.sent = []
        async def accept(self):
            pass
        async def send_text(self, text):
            self.sent.append(json.loads(text))

    fake_ws = FakeWebSocket()
    await ws_manager.connect(job_id, fake_ws)
    try:
        test_payload = {
            "type": "stage_update",
            "job_id": job_id,
            "stage": "inferring",
            "progress": 60,
            "message": "Running MONAI 3D sliding-window"
        }
        await ws_manager.broadcast_job_event(job_id, test_payload)
        assert len(fake_ws.sent) == 1
        assert fake_ws.sent[0]["stage"] == "inferring"
        assert fake_ws.sent[0]["progress"] == 60
    finally:
        await ws_manager.disconnect(job_id, fake_ws)

def test_sync_notify_job_stage_execution():
    job_id = "test_job_sync_notify"
    # Should execute without throwing any exception
    notify_job_stage(
        job_id=job_id,
        stage="preprocessing",
        progress=25,
        message="Transforming volume"
    )
