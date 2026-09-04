"""Modal Serverless GPU Application for MONAI Medical Image Segmentation.
Autoscales to zero when idle, caches model weights in GPU VRAM across warm containers."""

import os
import io
import time
import base64
from typing import Dict, Any

try:
    import modal
    
    app = modal.App("medical-monai-inference")
    
    # Define remote container environment with GPU and MONAI dependencies
    image = (
        modal.Image.debian_slim(python_version="3.11")
        .pip_install(
            "torch>=2.2.0",
            "monai>=1.3.0",
            "nibabel>=5.2.0",
            "numpy>=1.26.0",
            "scikit-image>=0.22.0",
            "scipy>=1.12.0"
        )
    )

    @app.cls(image=image, gpu="T4", timeout=300, keep_warm=1)
    class MonaiServingModel:
        @modal.enter()
        def load_model(self):
            """Runs once on container start / GPU cold-start."""
            import torch
            from monai.networks.nets import UNet
            from monai.inferers import SlidingWindowInferer
            
            print("[Modal GPU] Cold start: Initializing UNet on CUDA...")
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            self.model = UNet(
                spatial_dims=3,
                in_channels=1,
                out_channels=2,
                channels=(16, 32, 64, 128, 256),
                strides=(2, 2, 2, 2),
                num_res_units=2,
                norm="batch",
            ).to(self.device)
            self.model.eval()

            self.inferer = SlidingWindowInferer(
                roi_size=(96, 96, 96),
                sw_batch_size=4,
                overlap=0.5,
                mode="gaussian"
            )
            print("[Modal GPU] Model loaded and warm in VRAM.")

        @modal.method()
        def predict_nifti_bytes(self, nifti_b64: str) -> Dict[str, Any]:
            """Performs sliding-window inference on base64-encoded NIfTI volume."""
            import tempfile
            import nibabel as nib
            from inferer.segmenter import MonaiSegmentationInferer

            start_t = time.time()
            nifti_bytes = base64.b64decode(nifti_b64)

            with tempfile.TemporaryDirectory() as tmpdir:
                in_path = os.path.join(tmpdir, "input.nii.gz")
                out_path = os.path.join(tmpdir, "mask.nii.gz")
                with open(in_path, "wb") as f:
                    f.write(nifti_bytes)

                inferer = MonaiSegmentationInferer(
                    model=self.model,
                    roi_size=(96, 96, 96),
                    device=self.device
                )
                result = inferer.predict(in_path, out_path)

                with open(out_path, "rb") as f:
                    mask_b64 = base64.b64encode(f.read()).decode("utf-8")

            latency_ms = int((time.time() - start_t) * 1000)
            return {
                "status": "success",
                "model": "spleen_ct_segmentation",
                "latency_ms": latency_ms,
                "volume_cm3": result["volume_cm3"],
                "confidence": result["confidence"],
                "voxel_count": result["voxel_count"],
                "mask_b64": mask_b64
            }

except ImportError:
    # Graceful fallback when running in environment where modal CLI isn't installed
    app = None
