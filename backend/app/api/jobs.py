import os
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.imaging import ProcessingJob, Series
from app.workers.inference_worker import process_inference_job

router = APIRouter()

@router.post("/jobs/{job_id}/start", tags=["Inference Execution"])
def start_job(job_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Dispatches queued inference job to background worker."""
    job = db.query(ProcessingJob).filter_by(job_id=job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    background_tasks.add_task(process_inference_job, job_id)
    return {
        "status": "started",
        "job_id": job_id,
        "message": "Inference job dispatched to background worker."
    }

@router.get("/series/{series_uid}/mask", tags=["Viewer Streaming"])
def get_series_mask(series_uid: str, db: Session = Depends(get_db)):
    """Streams predicted 3D NIfTI segmentation mask for Cornerstone3D overlay."""
    series = db.query(Series).filter_by(series_instance_uid=series_uid).first()
    if not series:
        raise HTTPException(status_code=404, detail="Series not found.")

    # Find completed job for this series
    job = db.query(ProcessingJob).filter_by(series_instance_uid=series_uid, status="completed").first()
    if not job or not job.mask_nifti_path or not os.path.exists(job.mask_nifti_path):
        raise HTTPException(status_code=404, detail="No completed segmentation mask found for this series.")

    return FileResponse(
        job.mask_nifti_path,
        media_type="application/gzip",
        filename=f"{series_uid}_mask.nii.gz"
    )
