import io
import pytest
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient
from main import app
from app.services.slice_renderer import extract_oriented_plane, apply_window_level, render_slice_to_png
from app.core.database import SessionLocal
from app.models.imaging import Series, Study, Patient

@pytest.fixture
def client():
    return TestClient(app)

def test_extract_oriented_planes():
    vol = np.zeros((30, 40, 50), dtype=np.float32)
    # Axial slice (Z)
    ax = extract_oriented_plane(vol, "axial", 25)
    assert ax.shape == (40, 30)

    # Coronal slice (Y)
    cor = extract_oriented_plane(vol, "coronal", 20)
    assert cor.shape == (50, 30)

    # Sagittal slice (X)
    sag = extract_oriented_plane(vol, "sagittal", 15)
    assert sag.shape == (50, 40)

def test_apply_window_level():
    data = np.array([-1000.0, 0.0, 40.0, 200.0, 1000.0], dtype=np.float32)
    # Soft tissue: W=400, L=40 -> lower=-160, upper=240
    norm = apply_window_level(data, window_width=400.0, window_level=40.0)
    assert norm.dtype == np.uint8
    assert norm[0] == 0       # clamped to 0
    assert norm[4] == 255     # clamped to 255
    # Center (40.0) should be halfway ~127
    assert 120 <= norm[2] <= 135

def test_render_slice_to_png():
    vol = np.ones((64, 64, 64), dtype=np.float32) * 50.0
    png_bytes = render_slice_to_png(vol, "axial", 32, window_width=400.0, window_level=40.0)
    assert png_bytes.startswith(b"\x89PNG\r\n\x1a\n")
    img = Image.open(io.BytesIO(png_bytes))
    assert img.format == "PNG"

def test_volume_dimensions_and_slice_endpoint(client):
    db = SessionLocal()
    p_id = "SUBJ-MPR-1"
    patient = db.query(Patient).filter_by(id=p_id).first()
    if not patient:
        patient = Patient(id=p_id, pseudonym="MPR^PATIENT")
        db.add(patient)
        db.commit()

    study_uid = "test_mpr_study_uid"
    study = db.query(Study).filter_by(study_instance_uid=study_uid).first()
    if not study:
        study = Study(study_instance_uid=study_uid, patient_id=patient.id, modalities="CT")
        db.add(study)
        db.commit()

    series_uid = "test_mpr_series_uid"
    series = db.query(Series).filter_by(series_instance_uid=series_uid).first()
    if not series:
        series = Series(
            series_instance_uid=series_uid,
            study_instance_uid=study_uid,
            modality="CT",
            series_number=1,
            series_description="CT ABDOMEN MPR",
            raw_storage_dir="storage/test_mpr"
        )
        db.add(series)
        db.commit()
    db.close()

    # Dimensions
    dim_res = client.get(f"/api/v1/volumes/{series_uid}/dimensions")
    assert dim_res.status_code == 200
    dim_data = dim_res.json()
    assert "dimensions" in dim_data
    assert "axial" in dim_data["dimensions"]

    # Slice extraction
    for plane in ["axial", "coronal", "sagittal"]:
        slice_res = client.get(f"/api/v1/volumes/{series_uid}/slice?plane={plane}&index=32")
        assert slice_res.status_code == 200
        assert slice_res.headers["content-type"] == "image/png"
        assert slice_res.content.startswith(b"\x89PNG\r\n\x1a\n")
