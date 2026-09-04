import pytest
from fastapi.testclient import TestClient
from main import app
from app.core.database import SessionLocal
from app.models.imaging import Series, Study, Patient, Annotation

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture(autouse=True)
def seed_series():
    db = SessionLocal()
    p_id = "SUBJ-ANN-TEST"
    patient = db.query(Patient).filter_by(id=p_id).first()
    if not patient:
        patient = Patient(id=p_id, pseudonym="ANN^PATIENT")
        db.add(patient)
        db.commit()

    study_uid = "study_ann_test_uid"
    study = db.query(Study).filter_by(study_instance_uid=study_uid).first()
    if not study:
        study = Study(study_instance_uid=study_uid, patient_id=patient.id, modalities="CT")
        db.add(study)
        db.commit()

    series_uid = "series_ann_test_uid"
    series = db.query(Series).filter_by(series_instance_uid=series_uid).first()
    if not series:
        series = Series(
            series_instance_uid=series_uid,
            study_instance_uid=study_uid,
            modality="CT",
            series_number=1,
            series_description="CT ABDOMEN ANNOTATIONS",
            raw_storage_dir="storage/test_ann"
        )
        db.add(series)
        db.commit()
    db.close()
    return series_uid

def test_annotation_crud_lifecycle(client, seed_series):
    series_uid = seed_series

    # 1. Create Caliper Annotation
    create_payload = {
        "series_instance_uid": series_uid,
        "slice_index": 64,
        "plane": "axial",
        "annotation_type": "caliper",
        "label": "Aorta Diameter",
        "unit": "mm",
        "measurement_value": 24.5,
        "geometry": {"start": {"x": 242, "y": 340}, "end": {"x": 242, "y": 365}},
        "color": "#ef4444"
    }
    create_res = client.post("/api/v1/annotations", json=create_payload)
    assert create_res.status_code == 201
    ann_data = create_res.json()
    assert "id" in ann_data
    ann_id = ann_data["id"]
    assert ann_data["measurement_value"] == 24.5

    # 2. Get Series Annotations
    get_res = client.get(f"/api/v1/series/{series_uid}/annotations")
    assert get_res.status_code == 200
    items = get_res.json()
    assert any(a["id"] == ann_id for a in items)

    # 3. Patch Annotation
    patch_res = client.patch(f"/api/v1/annotations/{ann_id}", json={"label": "Abdominal Aorta", "measurement_value": 25.1})
    assert patch_res.status_code == 200
    assert patch_res.json()["label"] == "Abdominal Aorta"
    assert patch_res.json()["measurement_value"] == 25.1

    # 4. Export JSON
    export_json = client.get(f"/api/v1/series/{series_uid}/annotations/export?format=json")
    assert export_json.status_code == 200
    assert export_json.json()["export_format"] == "json"
    assert export_json.json()["total_annotations"] >= 1

    # 5. Export DICOM SR (TID 1500)
    export_sr = client.get(f"/api/v1/series/{series_uid}/annotations/export?format=sr")
    assert export_sr.status_code == 200
    sr_data = export_sr.json()
    assert sr_data["TemplateID"] == "TID 1500"
    assert sr_data["SOPClassUID"] == "1.2.840.10008.5.1.4.1.1.88.22"
    assert len(sr_data["ContentTree"]) >= 1
    assert sr_data["ContentTree"][0]["ValueType"] == "NUM"

    # 6. Delete Annotation
    del_res = client.delete(f"/api/v1/annotations/{ann_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "deleted"

    # Verify deleted
    get_after = client.get(f"/api/v1/series/{series_uid}/annotations")
    assert not any(a["id"] == ann_id for a in get_after.json())
