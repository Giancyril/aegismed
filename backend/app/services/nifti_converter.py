import os
from typing import List
import numpy as np
import nibabel as nib
import pydicom

class NiftiConverter:
    """Converts sorted 2D DICOM series slices into standard 3D NIfTI volumes (.nii.gz)."""

    @staticmethod
    def dicom_series_to_nifti(dicom_file_paths: List[str], output_nifti_path: str) -> str:
        """Reads DICOM slices, sorts spatially, calculates voxel affine, and writes NIfTI."""
        if not dicom_file_paths:
            raise ValueError("No DICOM files provided for NIfTI conversion.")

        # Read all datasets with force=True for clinical resilience
        datasets = [pydicom.dcmread(p, force=True) for p in dicom_file_paths]

        # Sort slices by ImagePositionPatient (Z-axis) or InstanceNumber
        def get_slice_position(ds):
            if hasattr(ds, "ImagePositionPatient"):
                return float(ds.ImagePositionPatient[2])
            return float(getattr(ds, "InstanceNumber", 0))

        datasets.sort(key=get_slice_position)

        # Build 3D voxel volume
        pixel_slices = []
        for ds in datasets:
            arr = ds.pixel_array.astype(np.float32)
            slope = float(getattr(ds, "RescaleSlope", 1.0))
            intercept = float(getattr(ds, "RescaleIntercept", 0.0))
            hu_slice = arr * slope + intercept
            pixel_slices.append(hu_slice)

        # Stack slices into 3D volume (X, Y, Z)
        volume_3d = np.stack(pixel_slices, axis=-1)

        # Calculate Affine matrix from DICOM geometry
        first_ds = datasets[0]
        pixel_spacing = getattr(first_ds, "PixelSpacing", [1.0, 1.0])
        dx = float(pixel_spacing[0])
        dy = float(pixel_spacing[1])
        
        if len(datasets) > 1 and hasattr(datasets[0], "ImagePositionPatient") and hasattr(datasets[1], "ImagePositionPatient"):
            dz = abs(float(datasets[1].ImagePositionPatient[2]) - float(datasets[0].ImagePositionPatient[2]))
        else:
            dz = float(getattr(first_ds, "SliceThickness", 1.0))

        affine = np.diag([dx, dy, dz if dz > 0 else 1.0, 1.0])

        os.makedirs(os.path.dirname(output_nifti_path), exist_ok=True)
        nifti_img = nib.Nifti1Image(volume_3d, affine)
        nib.save(nifti_img, output_nifti_path)

        return output_nifti_path
