from typing import Dict, Any, Optional, Tuple
from monai.transforms import (
    Compose,
    LoadImaged,
    EnsureChannelFirstd,
    Orientationd,
    Spacingd,
    ScaleIntensityRanged,
    NormalizeIntensityd,
    CropForegroundd,
    EnsureTyped,
    CastToTyped,
)
import torch

class MedicalPreprocessingPipeline:
    """Reusable, modality-aware MONAI preprocessing pipeline.
    Handles canonical reorientation (RAS), voxel resampling, HU/Z-score normalization,
    and background foreground cropping."""

    # Clinical CT Windowing Presets (HU)
    CT_WINDOWS = {
        "abdomen": (-175.0, 250.0), # Standard Spleen / Liver / Kidneys
        "soft_tissue": (-160.0, 240.0),
        "lung": (-1000.0, -400.0),
        "bone": (-200.0, 1000.0),
        "brain": (0.0, 80.0),
    }

    @classmethod
    def get_transforms(
        cls,
        modality: str = "CT",
        target_spacing: Tuple[float, float, float] = (1.5, 1.5, 2.0),
        window_preset: str = "abdomen",
        keys: Tuple[str, ...] = ("image",)
    ) -> Compose:
        """Constructs and returns an executable MONAI Compose transform chain."""
        modality_upper = modality.upper()
        transform_list = [
            LoadImaged(keys=keys, image_only=True),
            EnsureChannelFirstd(keys=keys),
            Orientationd(keys=keys, axcodes="RAS"),
            Spacingd(keys=keys, pixdim=target_spacing, mode="bilinear"),
        ]

        if modality_upper == "CT":
            # CT Hounsfield Unit scaling
            a_min, a_max = cls.CT_WINDOWS.get(window_preset, cls.CT_WINDOWS["abdomen"])
            transform_list.extend([
                ScaleIntensityRanged(
                    keys=keys,
                    a_min=a_min,
                    a_max=a_max,
                    b_min=0.0,
                    b_max=1.0,
                    clip=True
                ),
                CropForegroundd(keys=keys, source_key=keys[0], select_fn=lambda x: x > 0),
            ])
        elif modality_upper in ("MR", "MRI"):
            # MRI Z-Score normalization
            transform_list.extend([
                NormalizeIntensityd(keys=keys, nonzero=True, channel_wise=True),
                CropForegroundd(keys=keys, source_key=keys[0], select_fn=lambda x: x > 0),
            ])
        else:
            # Generic normalization
            transform_list.append(
                NormalizeIntensityd(keys=keys, nonzero=True)
            )

        transform_list.extend([
            CastToTyped(keys=keys, dtype=torch.float32),
            EnsureTyped(keys=keys)
        ])

        return Compose(transform_list)

    @classmethod
    def preprocess_volume(
        cls,
        volume_path: str,
        modality: str = "CT",
        target_spacing: Tuple[float, float, float] = (1.5, 1.5, 2.0)
    ) -> Dict[str, Any]:
        """Executes preprocessing chain on a single 3D volume (e.g. NIfTI file).
        Returns a dictionary containing the processed tensor and spatial metadata."""
        pipeline = cls.get_transforms(modality=modality, target_spacing=target_spacing)
        data = {"image": volume_path}
        processed = pipeline(data)
        return processed
