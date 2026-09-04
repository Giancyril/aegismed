import os
import torch
import torch.nn as nn
from typing import Optional
from monai.networks.nets import UNet

class ModelLoader:
    """Loads MONAI segmentation models (pre-trained bundle or standard architecture)."""

    @staticmethod
    def get_spleen_segmentation_model(device: str = "cpu") -> nn.Module:
        """Returns standard 3D UNet configured for spleen CT segmentation (2 classes: bg, spleen)."""
        model = UNet(
            spatial_dims=3,
            in_channels=1,
            out_channels=2,
            channels=(16, 32, 64, 128, 256),
            strides=(2, 2, 2, 2),
            num_res_units=2,
            norm="batch",
        ).to(device)

        model.eval()
        return model
