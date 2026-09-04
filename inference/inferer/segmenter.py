import os
from typing import Dict, Any, Tuple, Optional
import numpy as np
import nibabel as nib
import torch
from scipy import ndimage
from monai.inferers import SlidingWindowInferer
from transforms.pipeline import MedicalPreprocessingPipeline
from models.model_loader import ModelLoader

class MonaiSegmentationInferer:
    """End-to-end 3D Sliding-Window Segmentation Engine.
    Executes MONAI preprocessing -> 3D patch-based sliding-window inference -> post-processing -> NIfTI export."""

    def __init__(
        self,
        model: Optional[torch.nn.Module] = None,
        roi_size: Tuple[int, int, int] = (64, 64, 64),
        sw_batch_size: int = 4,
        overlap: float = 0.5,
        device: Optional[str] = None
    ):
        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device

        self.roi_size = roi_size
        self.sw_batch_size = sw_batch_size
        self.overlap = overlap

        # Initialize SlidingWindowInferer with Gaussian blending
        self.inferer = SlidingWindowInferer(
            roi_size=self.roi_size,
            sw_batch_size=self.sw_batch_size,
            overlap=self.overlap,
            mode="gaussian"
        )

        if model is None:
            self.model = ModelLoader.get_spleen_segmentation_model(device=self.device)
        else:
            self.model = model.to(self.device)
            self.model.eval()

    @staticmethod
    def _keep_largest_component(binary_mask: np.ndarray) -> np.ndarray:
        """Extracts the single largest connected component using scipy.ndimage."""
        labeled_array, num_features = ndimage.label(binary_mask)
        if num_features <= 1:
            return binary_mask.astype(np.uint8)
        sizes = ndimage.sum(binary_mask, labeled_array, range(1, num_features + 1))
        largest_label = np.argmax(sizes) + 1
        return (labeled_array == largest_label).astype(np.uint8)

    def predict(
        self,
        volume_path: str,
        output_mask_path: Optional[str] = None,
        modality: str = "CT"
    ) -> Dict[str, Any]:
        """Runs end-to-end inference on a 3D volume."""
        orig_nii = nib.load(volume_path)
        orig_affine = orig_nii.affine
        zooms = orig_nii.header.get_zooms()[:3]
        voxel_volume_mm3 = float(zooms[0] * zooms[1] * zooms[2])

        # Preprocess with MONAI transform chain
        processed = MedicalPreprocessingPipeline.preprocess_volume(
            volume_path=volume_path,
            modality=modality
        )
        image_tensor = processed["image"].unsqueeze(0).to(self.device) # Shape: (1, 1, H, W, D)

        # Execute Sliding Window Inference
        with torch.no_grad():
            logits = self.inferer(image_tensor, self.model) # Shape: (1, 2, H, W, D)
            probs = torch.softmax(logits, dim=1) # (1, 2, H, W, D)
            pred_mask = torch.argmax(probs, dim=1) # (1, H, W, D)

        # Extract numpy arrays with shape (H, W, D)
        mask_np = pred_mask.squeeze(0).cpu().numpy().astype(np.uint8)
        probs_np = probs.squeeze(0).cpu().numpy() # (2, H, W, D)

        # Post-processing: keep largest connected component for foreground (class 1: spleen)
        cleaned_mask = self._keep_largest_component(mask_np == 1)

        spleen_voxels = int(np.sum(cleaned_mask == 1))
        volume_cm3 = round((spleen_voxels * voxel_volume_mm3) / 1000.0, 2)

        if spleen_voxels > 0:
            mean_conf = float(np.mean(probs_np[1][cleaned_mask == 1]))
        else:
            mean_conf = float(np.max(probs_np[1]))

        # Save output NIfTI mask
        if output_mask_path:
            os.makedirs(os.path.dirname(output_mask_path), exist_ok=True)
            mask_img = nib.Nifti1Image(cleaned_mask, orig_affine)
            nib.save(mask_img, output_mask_path)

        return {
            "status": "success",
            "model": "spleen_ct_segmentation",
            "device": self.device,
            "voxel_count": spleen_voxels,
            "volume_cm3": volume_cm3,
            "confidence": round(mean_conf, 4),
            "output_mask_path": output_mask_path,
            "spatial_shape": list(cleaned_mask.shape)
        }
