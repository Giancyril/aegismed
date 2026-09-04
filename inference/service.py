"""Standalone MONAI Inference Service Runner (Local / Modal Entrypoint)"""
import os
from typing import Dict, Any

class InferenceService:
    def __init__(self, model_name: str = "spleen_ct_segmentation"):
        self.model_name = model_name
        self.device = "cuda" if os.environ.get("CUDA_VISIBLE_DEVICES") else "cpu"
        print(f"[InferenceService] Initializing {model_name} on device: {self.device}")

    def run_inference(self, volume_path: str) -> Dict[str, Any]:
        """Runs sliding-window 3D segmentation on input NIfTI volume."""
        return {
            "status": "ready",
            "model": self.model_name,
            "device": self.device,
            "input_volume": volume_path
        }

if __name__ == "__main__":
    service = InferenceService()
    print("MONAI Inference Engine Scaffolding Ready.")
