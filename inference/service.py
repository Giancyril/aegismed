import os
from typing import Dict, Any, Optional
from inferer.segmenter import MonaiSegmentationInferer

class InferenceService:
    """Production inference service wrapper for local or serverless deployment."""

    def __init__(self, model_name: str = "spleen_ct_segmentation"):
        self.model_name = model_name
        self.inferer = MonaiSegmentationInferer()
        print(f"[InferenceService] Initialized {model_name} on device: {self.inferer.device}")

    def run_inference(self, volume_path: str, output_mask_path: Optional[str] = None) -> Dict[str, Any]:
        return self.inferer.predict(
            volume_path=volume_path,
            output_mask_path=output_mask_path,
            modality="CT"
        )

if __name__ == "__main__":
    service = InferenceService()
    print("MONAI Sliding-Window Inference Service Ready.")
