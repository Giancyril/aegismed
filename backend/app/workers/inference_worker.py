from app.api.ws_jobs import notify_job_stage
import os
import sys
import time
from typing import Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.imaging import ProcessingJob, Series

# Add inference module to sys.path
inference_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../inference"))
if inference_path not in sys.path:
    sys.path.insert(0, inference_path)

def process_inference_job(job_id: str):
    """Background worker executing the full preprocessing & inference pipeline."""
    db: Session = SessionLocal()
    try:
        job = db.query(ProcessingJob).filter_by(job_id=job_id).first()
        if not job:
            return

        series = db.query(Series).filter_by(series_instance_uid=job.series_instance_uid).first()
        if not series or not series.nifti_volume_path or not os.path.exists(series.nifti_volume_path):
            job.status = "failed"
            job.error = "NIfTI volume file does not exist on storage."
            db.commit()
            return

        # Stage 1: Preprocessing
        job.status = "preprocessing"
        job.progress = 25
        job.message = "Applying MONAI transforms: reorientation to RAS, 1.5mm resampling, HU windowing..."
        db.commit()
        notify_job_stage(job_id, "preprocessing", 25, job.message)
        time.sleep(0.5)

        # Stage 2: Inference (Sliding Window Engine)
        job.status = "inferring"
        job.progress = 60
        job.message = "Running MONAI 3D sliding-window inference with Gaussian patch aggregation..."
        db.commit()
        notify_job_stage(job_id, "inferring", 60, job.message)

        mask_output_path = os.path.join(settings.MASKS_DIR, f"{series.series_instance_uid}_mask.nii.gz")

        from inferer.segmenter import MonaiSegmentationInferer
        inferer = MonaiSegmentationInferer(
            roi_size=(64, 64, 64),
            sw_batch_size=2,
            overlap=0.25,
            device="cpu"
        )
        result = inferer.predict(
            volume_path=series.nifti_volume_path,
            output_mask_path=mask_output_path,
            modality=series.modality or "CT"
        )

        # Stage 3: Postprocessing & Finalization
        job.status = "completed"
        job.progress = 100
        job.message = "Segmentation complete. 3D organ mask ready."
        job.mask_nifti_path = mask_output_path
        job.metrics = {
            "volume_cm3": result["volume_cm3"],
            "confidence": result["confidence"],
            "voxel_count": result["voxel_count"],
            "model": result["model"]
        }
        db.commit()
        notify_job_stage(job_id, "completed", 100, job.message, metrics=job.metrics)

    except Exception as e:
        if job:
            job.status = "failed"
            job.error = str(e)
            job.message = f"Inference pipeline failed: {str(e)}"
            db.commit()
            notify_job_stage(job_id, "failed", 100, job.message, error=str(e))
    finally:
        db.close()
