import io
import os
import tempfile
import pytest
import numpy as np
import nibabel as nib
import pydicom
from pydicom.dataset import FileDataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian, SecondaryCaptureImageStorage, generate_uid

from app.services.dicom_service import DicomService
from app.services.nifti_converter import NiftiConverter
from fastapi.testclient import TestClient
from main import app

def create_synthetic_dicom_dataset(patient_name="DOE^JOHN", slice_index=1, z_pos=0.0):
    """Generates a valid in-memory FileDataset slice with standard 128-byte preamble."""
    file_meta = FileMetaDataset()
    file_meta.MediaStorageSOPClassUID = SecondaryCaptureImageStorage
    file_meta.MediaStorageSOPInstanceUID = generate_uid()
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian

    ds = FileDataset("test.dcm", {}, file_meta=file_meta, preamble=b"\0" * 128)
    ds.is_little_endian = True
    ds.is_implicit_VR = False

    ds.SOPClassUID = file_meta.MediaStorageSOPClassUID
    ds.SOPInstanceUID = file_meta.MediaStorageSOPInstanceUID
    ds.StudyInstanceUID = "1.2.826.0.1.3680043.8.498.1001"
    ds.SeriesInstanceUID = "1.2.826.0.1.3680043.8.498.2001"
    ds.PatientID = "ORIGINAL_MRN_12345"
    ds.PatientName = patient_name
    ds.PatientBirthDate = "19720101"
    ds.Modality = "CT"
    ds.SeriesNumber = 2
    ds.InstanceNumber = slice_index
    ds.ImagePositionPatient = [0.0, 0.0, z_pos]
    ds.SliceLocation = z_pos
    ds.SliceThickness = 2.0
    ds.PixelSpacing = [1.0, 1.0]
    ds.RescaleSlope = 1.0
    ds.RescaleIntercept = -1024.0

    pixel_array = (np.ones((64, 64), dtype=np.uint16) * 1000)
    ds.Rows = pixel_array.shape[0]
    ds.Columns = pixel_array.shape[1]
    ds.BitsAllocated = 16
    ds.BitsStored = 16
    ds.HighBit = 15
    ds.PixelRepresentation = 0
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.PixelData = pixel_array.tobytes()

    return ds

def dataset_to_bytes(ds):
    fp = io.BytesIO()
    pydicom.dcmwrite(fp, ds)
    fp.seek(0)
    return fp.read()

def test_dicom_validation():
    ds = create_synthetic_dicom_dataset()
    valid_bytes = dataset_to_bytes(ds)
    is_valid, parsed_ds, err = DicomService.validate_dicom_bytes(valid_bytes)
    assert is_valid is True
    assert parsed_ds is not None
    assert err is None

    is_valid, parsed_ds, err = DicomService.validate_dicom_bytes(b"NOT_A_DICOM_FILE_HEADER")
    assert is_valid is False
    assert parsed_ds is None
    assert err is not None

def test_dicom_deidentification():
    ds = create_synthetic_dicom_dataset(patient_name="SENSITIVE^PATIENT")
    deid_ds, metadata = DicomService.deidentify_dataset(ds)

    assert deid_ds.PatientName != "SENSITIVE^PATIENT"
    assert "ANON-" in str(deid_ds.PatientName)
    assert deid_ds.PatientBirthDate == ""
    assert metadata["patient_id"] == str(deid_ds.PatientID)
    assert metadata["modality"] == "CT"
    assert metadata["series_instance_uid"] == "1.2.826.0.1.3680043.8.498.2001"

def test_nifti_conversion():
    with tempfile.TemporaryDirectory() as tmpdir:
        slice_paths = []
        for i in range(3):
            ds = create_synthetic_dicom_dataset(slice_index=i + 1, z_pos=float(i * 2))
            p = os.path.join(tmpdir, f"slice_{i}.dcm")
            ds.save_as(p)
            slice_paths.append(p)

        output_nifti = os.path.join(tmpdir, "test_volume.nii.gz")
        converted_path = NiftiConverter.dicom_series_to_nifti(slice_paths, output_nifti)

        assert os.path.exists(converted_path)
        img = nib.load(converted_path)
        assert len(img.shape) == 3
        assert img.shape[2] == 3
        assert img.header.get_zooms()[:2] == (1.0, 1.0)

def test_api_upload_flow():
    client = TestClient(app)
    
    health_res = client.get("/api/v1/health")
    assert health_res.status_code == 200
    assert health_res.json()["status"] == "healthy"

    ds = create_synthetic_dicom_dataset()
    raw_bytes = dataset_to_bytes(ds)

    response = client.post(
        "/api/v1/upload/dicom",
        files=[("files", ("test_slice.dcm", raw_bytes, "application/dicom"))]
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert len(data["series"]) == 1
    assert data["series"][0]["modality"] == "CT"
    assert data["series"][0]["job_id"].startswith("job_")
