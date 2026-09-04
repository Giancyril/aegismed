import os
import tempfile
import pytest
import numpy as np
import nibabel as nib
from inferer.segmenter import MonaiSegmentationInferer

def create_sample_ct_nifti(path: str, shape=(48, 48, 32)):
    affine = np.diag([1.5, 1.5, 2.0, 1.0])
    data = np.random.uniform(low=-150, high=250, size=shape).astype(np.float32)
    # Inject synthetic foreground spleen structure
    data[16:32, 16:32, 10:24] += 150
    img = nib.Nifti1Image(data, affine)
    nib.save(img, path)
    return path

def test_sliding_window_inference():
    with tempfile.TemporaryDirectory() as tmpdir:
        input_nii = os.path.join(tmpdir, "input_scan.nii.gz")
        output_mask = os.path.join(tmpdir, "predicted_mask.nii.gz")
        create_sample_ct_nifti(input_nii)

        # Initialize inferer with small ROI size suited for unit testing
        inferer = MonaiSegmentationInferer(
            roi_size=(32, 32, 32),
            sw_batch_size=2,
            overlap=0.25,
            device="cpu"
        )

        result = inferer.predict(
            volume_path=input_nii,
            output_mask_path=output_mask,
            modality="CT"
        )

        assert result["status"] == "success"
        assert result["model"] == "spleen_ct_segmentation"
        assert "volume_cm3" in result
        assert "confidence" in result
        assert os.path.exists(output_mask)

        # Verify predicted mask
        mask_nii = nib.load(output_mask)
        assert mask_nii.shape == (48, 48, 32)
        assert mask_nii.get_data_dtype() == np.uint8
