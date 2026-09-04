import os
import time
from typing import Dict, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from service import InferenceService

app = FastAPI(
    title="MONAI Model Serving Layer",
    description="GPU-accelerated sliding window inference for medical imaging volumes",
    version="1.0.0"
)

service = InferenceService()

class InferenceRequest(BaseModel):
    volume_path: str
    output_mask_path: str
    modality: str = "CT"

@app.get("/health")
def health_status():
    return {
        "status": "online",
        "device": service.inferer.device,
        "model": service.model_name
    }

@app.post("/predict")
def predict_volume(req: InferenceRequest):
    if not os.path.exists(req.volume_path):
        raise HTTPException(status_code=404, detail="Input volume not found.")

    start_t = time.time()
    result = service.run_inference(
        volume_path=req.volume_path,
        output_mask_path=req.output_mask_path
    )
    result["latency_ms"] = int((time.time() - start_t) * 1000)
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
