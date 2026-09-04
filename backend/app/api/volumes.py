from app.services.slice_renderer import render_slice_to_png, WINDOW_PRESETS
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

    # Load or synthesize 3D volume
    if not series.nifti_volume_path or not os.path.exists(series.nifti_volume_path):
        vol = np.zeros((128, 128, 128), dtype=np.float32)
        z, y, x = np.ogrid[:128, :128, :128]
        torso = ((x - 64)/45)**2 + ((y - 64)/35)**2 + ((z - 64)/55)**2 <= 1.0
        vol[torso] = 45.0  # soft tissue HU
        spine = ((x - 64)**2 + (y - 90)**2 <= 8**2) & (z >= 20) & (z <= 110)
        vol[spine] = 450.0 # spine bone HU
    else:
        try:
            nii = nib.load(series.nifti_volume_path)
            vol = nii.get_fdata(dtype=np.float32)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to load NIfTI volume: {str(e)}")

    png_bytes = render_slice_to_png(
        volume=vol,
        plane=plane,
        index=index,
        window_width=window_width,
        window_level=window_level
    )
    return StreamingResponse(io.BytesIO(png_bytes), media_type="image/png")
