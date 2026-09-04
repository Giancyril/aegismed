import os
import tempfile
import pytest
import numpy as np
import nibabel as nib
import torch
from transforms.pipeline import MedicalPreprocessingPipeline

def create_dummy_nifti(file_path: str, shape=(40, 40, 30), affine=None):
    if affine is None:
        affine = np.diag([2.0, 2.0, 2.5, 1.0])
    # Create synthetic volume with values resembling CT HU (-1000 to +1000)
    data = np.random.uniform(low=-200, high=300, size=shape).astype(np.float32)
    # Add a bright foreground structure
    data[10:30, 10:30, 5:25] += 200
    img = nib.Nifti1Image(data, affine)
    nib.save(img, file_path)
    return file_path

def test_ct_preprocessing_chain():
    with tempfile.TemporaryDirectory() as tmpdir:
        input_nii = os.path.join(tmpdir, "sample_ct.nii.gz")
        create_dummy_nifti(input_nii, shape=(32, 32, 20), affine=np.diag([2.0, 2.0, 3.0, 1.0]))

        # Run CT preprocessing pipeline
        processed = MedicalPreprocessingPipeline.preprocess_volume(
            volume_path=input_nii,
            modality="CT",
            target_spacing=(1.5, 1.5, 2.0)
        )

        tensor = processed["image"]
        assert isinstance(tensor, torch.Tensor)
        # Should have channel first: (1, X, Y, Z)
        assert tensor.ndim == 4
        assert tensor.shape[0] == 1
        # Intensity should be clipped between 0.0 and 1.0 for CT windowing
        assert tensor.min() >= 0.0
        assert tensor.max() <= 1.0

def test_mri_preprocessing_chain():
    with tempfile.TemporaryDirectory() as tmpdir:
        input_nii = os.path.join(tmpdir, "sample_mri.nii.gz")
        create_dummy_nifti(input_nii, shape=(28, 28, 16), affine=np.diag([1.2, 1.2, 1.5, 1.0]))

        # Run MRI preprocessing pipeline
        processed = MedicalPreprocessingPipeline.preprocess_volume(
            volume_path=input_nii,
            modality="MR",
            target_spacing=(1.0, 1.0, 1.0)
        )

        tensor = processed["image"]
        assert isinstance(tensor, torch.Tensor)
        assert tensor.ndim == 4
        assert tensor.shape[0] == 1
