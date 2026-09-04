import time
import uuid
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("medical_pipeline")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [ReqID: %(name)s] %(message)s"
)

class RequestTracingMiddleware(BaseHTTPMiddleware):
    """Assigns unique X-Request-ID, logs request latency and status codes."""

    async def dispatch(self, request: Request, call_next):
        req_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
        start_time = time.time()

        response: Response = await call_next(request)

        latency_ms = (time.time() - start_time) * 1000
        response.headers["X-Request-ID"] = req_id
        response.headers["X-Response-Time-MS"] = f"{latency_ms:.2f}"

        logger.info(
            f"Method={request.method} Path={request.url.path} Status={response.status_code} Latency={latency_ms:.2f}ms ReqID={req_id}"
        )
        return response
