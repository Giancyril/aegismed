import os
import tempfile
import pytest
import numpy as np
import nibabel as nib
from fastapi.testclient import TestClient
from main import app
from app.core.database import SessionLocal
from app.models.imaging import Patient, Study, Series, ProcessingJob
from app.workers.inference_worker import process_inference_job

def test_async_job_pipeline_and_mask_streaming():
    client = TestClient(app)
    db = SessionLocal()

    with tempfile.TemporaryDirectory() as tmpdir:
        nii_path = os.path.join(tmpdir, "test_input.nii.gz")
        # Create small test CT volume
        data = np.random.uniform(-100, 200, size=(32, 32, 20)).astype(np.float32)
        data[10:20, 10:20, 5:15] += 120
        img = nib.Nifti1Image(data, np.diag([1.5, 1.5, 2.0, 1.0]))
        nib.save(img, nii_path)

        # Seed test entities in DB
        series_uid = "1.2.826.0.1.3680043.99.1"
        study_uid = "1.2.826.0.1.3680043.99.0"
        patient_id = "ANON-TEST-123"

        p = Patient(id=patient_id, pseudonym=patient_id)
        db.merge(p)
        s = Study(study_instance_uid=study_uid, patient_id=patient_id)
        db.merge(s)
        ser = Series(
            series_instance_uid=series_uid,
            study_instance_uid=study_uid,
            raw_storage_dir=tmpdir,
            nifti_volume_path=nii_path,
            num_instances=20
        )
        db.merge(ser)
        job_id = "job_test_serving_001"
        job = ProcessingJob(
            job_id=job_id,
            series_instance_uid=series_uid,
            status="queued"
        )
        db.merge(job)
        db.commit()

        # Execute worker processing directly
        process_inference_job(job_id)

        # Query updated job from API
        res = client.get(f"/api/v1/jobs/{job_id}")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "completed"
        assert data["progress"] == 100
        assert data["metrics"] is not None
        assert "volume_cm3" in data["metrics"]

        # Test mask streaming endpoint
        mask_res = client.get(f"/api/v1/series/{series_uid}/mask")
        assert mask_res.status_code == 200
        assert len(mask_res.content) > 0

    db.close()
