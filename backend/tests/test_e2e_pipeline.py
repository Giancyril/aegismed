import io
import os
import zipfile
import pytest
import numpy as np
import nibabel as nib
import pydicom
from pydicom.dataset import FileDataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian, SecondaryCaptureImageStorage, generate_uid
from fastapi.testclient import TestClient
from main import app
from app.workers.inference_worker import process_inference_job

client = TestClient(app)

def create_dicom_bytes(slice_idx=1, z_pos=0.0):
    file_meta = FileMetaDataset()
    file_meta.MediaStorageSOPClassUID = SecondaryCaptureImageStorage
    file_meta.MediaStorageSOPInstanceUID = generate_uid()
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian

    ds = FileDataset("slice.dcm", {}, file_meta=file_meta, preamble=b"\0" * 128)
    ds.is_little_endian = True
    ds.is_implicit_VR = False

    ds.SOPClassUID = file_meta.MediaStorageSOPClassUID
    ds.SOPInstanceUID = file_meta.MediaStorageSOPInstanceUID
    ds.StudyInstanceUID = "1.2.826.0.1.3680043.999.1"
    ds.SeriesInstanceUID = "1.2.826.0.1.3680043.999.2"
    ds.PatientID = "PATIENT_PHI_SECRET_778"
    ds.PatientName = "DOE^JANE"
    ds.PatientBirthDate = "19650412"
    ds.Modality = "CT"
    ds.SeriesNumber = 1
    ds.InstanceNumber = slice_idx
    ds.ImagePositionPatient = [0.0, 0.0, z_pos]
    ds.SliceLocation = z_pos
    ds.SliceThickness = 2.0
    ds.PixelSpacing = [1.5, 1.5]
    ds.RescaleSlope = 1.0
    ds.RescaleIntercept = -1024.0

    arr = (np.ones((32, 32), dtype=np.uint16) * 1050)
    # Synthetic spleen region
    arr[10:22, 10:22] = 1120
    ds.Rows = 32
    ds.Columns = 32
    ds.BitsAllocated = 16
    ds.BitsStored = 16
    ds.HighBit = 15
    ds.PixelRepresentation = 0
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.PixelData = arr.tobytes()

    fp = io.BytesIO()
    pydicom.dcmwrite(fp, ds)
    fp.seek(0)
    return fp.read()

def test_full_e2e_pipeline_and_error_states():
    # 1. Error state: Upload non-DICOM payload
    bad_upload = client.post(
        "/api/v1/upload/dicom",
        files=[("files", ("corrupt.txt", b"plain text is not a dicom", "text/plain"))]
    )
    assert bad_upload.status_code == 422
    assert "No valid DICOM datasets found" in bad_upload.json()["detail"]

    # 2. Package multi-slice CT study into ZIP archive
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as z:
        for idx in range(3):
            dcm_data = create_dicom_bytes(slice_idx=idx+1, z_pos=float(idx * 2))
            z.writestr(f"study/slice_{idx}.dcm", dcm_data)
    zip_buffer.seek(0)

    # 3. Upload ZIP archive
    upload_res = client.post(
        "/api/v1/upload/dicom",
        files=[("files", ("test_study.zip", zip_buffer.getvalue(), "application/zip"))]
    )
    assert upload_res.status_code == 200
    upload_data = upload_res.json()
    assert upload_data["status"] == "success"
    
    series_info = upload_data["series"][0]
    series_uid = series_info["series_instance_uid"]
    job_id = series_info["job_id"]
    patient_anon = series_info["patient_pseudonym"]

    # Verify PS 3.15 de-identification
    assert "PATIENT_PHI_SECRET" not in patient_anon
    assert patient_anon.startswith("ANON-")

    # 4. Verify request tracing header
    assert "X-Request-ID" in upload_res.headers
    assert "X-Response-Time-MS" in upload_res.headers

    # 5. Execute async pipeline worker for job
    process_inference_job(job_id)

    # 6. Verify completed job status and metrics
    job_res = client.get(f"/api/v1/jobs/{job_id}")
    assert job_res.status_code == 200
    job_data = job_res.json()
    assert job_data["status"] == "completed"
    assert job_data["progress"] == 100
    assert job_data["metrics"]["volume_cm3"] >= 0
    assert "confidence" in job_data["metrics"]

    # 7. Verify segmentation mask stream
    mask_res = client.get(f"/api/v1/series/{series_uid}/mask")
    assert mask_res.status_code == 200
    assert len(mask_res.content) > 0

    # 8. Error state: Request mask for non-existent series
    missing_mask = client.get("/api/v1/series/non_existent_uid/mask")
    assert missing_mask.status_code == 404

    # 9. Error state: Request status for non-existent job
    missing_job = client.get("/api/v1/jobs/job_unknown_99999")
    assert missing_job.status_code == 404
