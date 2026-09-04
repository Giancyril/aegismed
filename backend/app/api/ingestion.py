import os
import zipfile
import uuid
from typing import List
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.imaging import Patient, Study, Series, Instance, ProcessingJob
from app.services.dicom_service import DicomService
from app.services.nifti_converter import NiftiConverter

router = APIRouter()

@router.post("/upload/dicom", tags=["Ingestion"])
async def upload_dicom(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """Accepts single/multiple .dcm files or a study ZIP archive.
    Validates, de-identifies via PS 3.15, builds NIfTI volume, and queues pipeline job."""
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    extracted_slices = []

    for file in files:
        file_bytes = await file.read()
        filename = file.filename.lower()

        # Handle ZIP archive
        if filename.endswith(".zip"):
            import io
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
                for zip_name in z.namelist():
                    if not zip_name.endswith("/") and not zip_name.startswith("__MACOSX"):
                        slice_bytes = z.read(zip_name)
                        is_valid, ds, err = DicomService.validate_dicom_bytes(slice_bytes)
                        if is_valid and ds:
                            extracted_slices.append(ds)
        else:
            # Single DICOM slice
            is_valid, ds, err = DicomService.validate_dicom_bytes(file_bytes)
            if not is_valid or not ds:
                continue
            extracted_slices.append(ds)

    if not extracted_slices:
        raise HTTPException(status_code=422, detail="No valid DICOM datasets found in upload payload.")

    # Group slices by series
    series_map = {}
    for ds in extracted_slices:
        deid_ds, meta = DicomService.deidentify_dataset(ds)
        series_uid = meta["series_instance_uid"]
        if series_uid not in series_map:
            series_map[series_uid] = {
                "metadata": meta,
                "slices": []
            }
        series_map[series_uid]["slices"].append(deid_ds)

    ingested_series_responses = []

    for series_uid, data in series_map.items():
        meta = data["metadata"]
        slices = data["slices"]

        # Ensure DB Patient exists
        patient = db.query(Patient).filter_by(id=meta["patient_id"]).first()
        if not patient:
            patient = Patient(id=meta["patient_id"], pseudonym=meta["patient_id"])
            db.add(patient)
            db.commit()

        # Ensure DB Study exists
        study = db.query(Study).filter_by(study_instance_uid=meta["study_instance_uid"]).first()
        if not study:
            study = Study(
                study_instance_uid=meta["study_instance_uid"],
                patient_id=patient.id,
                study_description="Ingested Study"
            )
            db.add(study)
            db.commit()

        # Save de-identified DICOM slices to storage
        raw_series_dir = os.path.join(settings.UPLOAD_DIR, meta["study_instance_uid"], series_uid)
        os.makedirs(raw_series_dir, exist_ok=True)
        saved_file_paths = []

        for ds_slice in slices:
            slice_filename = f"{ds_slice.SOPInstanceUID}.dcm"
            slice_path = os.path.join(raw_series_dir, slice_filename)
            ds_slice.save_as(slice_path)
            saved_file_paths.append(slice_path)

        # Build 3D NIfTI volume
        nifti_path = os.path.join(settings.NIFTI_DIR, f"{series_uid}.nii.gz")
        try:
            NiftiConverter.dicom_series_to_nifti(saved_file_paths, nifti_path)
        except Exception as e:
            nifti_path = None

        # Persist Series in DB
        series = db.query(Series).filter_by(series_instance_uid=series_uid).first()
        if not series:
            series = Series(
                series_instance_uid=series_uid,
                study_instance_uid=study.study_instance_uid,
                series_number=meta["series_number"],
                series_description=meta["series_description"],
                modality=meta["modality"],
                num_instances=len(slices),
                slice_thickness=meta["slice_thickness"],
                pixel_spacing=meta["pixel_spacing"],
                rows=meta["rows"],
                columns=meta["columns"],
                raw_storage_dir=raw_series_dir,
                nifti_volume_path=nifti_path
            )
            db.add(series)
        else:
            series.num_instances = len(slices)
            series.nifti_volume_path = nifti_path

        # Create ProcessingJob
        job_id = f"job_{uuid.uuid4().hex[:10]}"
        job = ProcessingJob(
            job_id=job_id,
            series_instance_uid=series_uid,
            status="queued",
            progress=0,
            message="DICOM ingested, NIfTI generated. Queued for MONAI inference."
        )
        db.add(job)
        db.commit()

        ingested_series_responses.append({
            "series_instance_uid": series_uid,
            "patient_pseudonym": patient.pseudonym,
            "num_slices": len(slices),
            "modality": meta["modality"],
            "nifti_volume": nifti_path,
            "job_id": job_id
        })

    return {
        "status": "success",
        "message": f"Successfully ingested {len(extracted_slices)} DICOM instances across {len(series_map)} series.",
        "series": ingested_series_responses
    }

@router.get("/studies", tags=["Metadata"])
def list_studies(db: Session = Depends(get_db)):
    """Returns all ingested patient studies and series for clinical viewer."""
    studies = db.query(Study).all()
    results = []
    for s in studies:
        series_data = []
        for ser in s.series:
            series_data.append({
                "series_instance_uid": ser.series_instance_uid,
                "series_number": ser.series_number,
                "series_description": ser.series_description,
                "modality": ser.modality,
                "num_slices": ser.num_instances,
                "slice_thickness": ser.slice_thickness,
                "nifti_volume_path": ser.nifti_volume_path
            })
        results.append({
            "study_instance_uid": s.study_instance_uid,
            "patient_id": s.patient_id,
            "study_description": s.study_description,
            "series": series_data
        })
    return results

@router.get("/series/{series_uid}/nifti", tags=["Viewer Streaming"])
def get_series_nifti(series_uid: str, db: Session = Depends(get_db)):
    """Streams 3D NIfTI volume for volumetric rendering."""
    series = db.query(Series).filter_by(series_instance_uid=series_uid).first()
    if not series or not series.nifti_volume_path or not os.path.exists(series.nifti_volume_path):
        raise HTTPException(status_code=404, detail="NIfTI volume not found for this series.")
    return FileResponse(series.nifti_volume_path, media_type="application/gzip", filename=f"{series_uid}.nii.gz")

@router.get("/jobs/{job_id}", tags=["Jobs"])
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    """Queries async pipeline job status."""
    job = db.query(ProcessingJob).filter_by(job_id=job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return {
        "job_id": job.job_id,
        "series_instance_uid": job.series_instance_uid,
        "status": job.status,
        "progress": job.progress,
        "message": job.message,
        "error": job.error,
        "mask_nifti_path": job.mask_nifti_path,
        "metrics": job.metrics
    }
