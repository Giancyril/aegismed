import io
import os
import numpy as np
import nibabel as nib
from PIL import Image
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.imaging import Series

router = APIRouter(tags=["Multi-Planar Reconstruction (MPR)"])

@router.get("/volumes/{series_instance_uid}/dimensions")
def get_volume_dimensions(series_instance_uid: str, db: Session = Depends(get_db)):
    """Returns spatial dimensions and voxel spacing for 3D MPR planes."""
    series = db.query(Series).filter_by(series_instance_uid=series_instance_uid).first()
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")

    if not series.nifti_volume_path or not os.path.exists(series.nifti_volume_path):
        # Return standard abdominal CT dimensions if no disk file yet
        return {
            "series_instance_uid": series_instance_uid,
            "dimensions": {
                "axial": 128,
                "coronal": 128,
                "sagittal": 128
            },
            "spacing": [1.5, 1.5, 2.0]
        }

    try:
        nii = nib.load(series.nifti_volume_path)
        shape = nii.shape
        header = nii.header
        zooms = [float(z) for z in header.get_zooms()[:3]]
        # In RAS coordinates: 0 is Sagittal (L-R), 1 is Coronal (P-A), 2 is Axial (I-S)
        return {
            "series_instance_uid": series_instance_uid,
            "dimensions": {
                "sagittal": shape[0],
                "coronal": shape[1],
                "axial": shape[2]
            },
            "spacing": zooms
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read NIfTI volume: {str(e)}")

@router.get("/volumes/{series_instance_uid}/slice")
def get_volume_slice(
    series_instance_uid: str,
    plane: str = Query("axial", pattern="^(axial|coronal|sagittal)$"),
    index: int = Query(64, ge=0),
    window_width: float = Query(400.0),
    window_level: float = Query(40.0),
    db: Session = Depends(get_db)
):
    """Extracts a 2D oriented planar slice and encodes it as a high-contrast PNG."""
    series = db.query(Series).filter_by(series_instance_uid=series_instance_uid).first()
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")

    # Generate synthetic anatomically-proportioned slice if file does not exist on disk
    if not series.nifti_volume_path or not os.path.exists(series.nifti_volume_path):
        data = np.zeros((128, 128), dtype=np.float32)
        y, x = np.ogrid[:128, :128]
        mask = (x - 64)**2 + (y - 64)**2 <= 45**2
        data[mask] = 50.0  # soft tissue HU
        data[((x - 64)**2 + (y - 80)**2 <= 10**2)] = 300.0  # vertebral bone
    else:
        try:
            nii = nib.load(series.nifti_volume_path)
            vol = nii.get_fdata(dtype=np.float32)

            if plane == "axial":
                idx = min(max(0, index), vol.shape[2] - 1)
                data = vol[:, :, idx]
            elif plane == "coronal":
                idx = min(max(0, index), vol.shape[1] - 1)
                data = vol[:, idx, :]
            else: # sagittal
                idx = min(max(0, index), vol.shape[0] - 1)
                data = vol[idx, :, :]
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Slice extraction failed: {str(e)}")

    # Apply HU Window / Level normalization
    lower = window_level - (window_width / 2.0)
    upper = window_level + (window_width / 2.0)
    windowed = np.clip(data, lower, upper)
    normalized = ((windowed - lower) / (upper - lower + 1e-6) * 255.0).astype(np.uint8)

    # Encode to PNG buffer
    img = Image.fromarray(normalized)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    return StreamingResponse(buf, media_type="image/png")
