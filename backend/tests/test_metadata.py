import pytest
from fastapi.testclient import TestClient
from main import app
from app.services.tag_classifier import classify_tag_module, enrich_and_group_tags
from app.api.metadata import apply_phi_redaction
from app.core.database import SessionLocal
from app.models.imaging import Study

@pytest.fixture
def client():
    return TestClient(app)

def test_tag_classifier_modules():
    assert classify_tag_module("0010", "0010", "PatientName") == "Patient Identification Module"
    assert classify_tag_module("0008", "0020", "StudyDate") == "General Study Module"
    assert classify_tag_module("0008", "0070", "Manufacturer") == "General Equipment Module"
    assert classify_tag_module("0020", "000E", "SeriesInstanceUID") == "General Series Module"
    assert classify_tag_module("0028", "0010", "Rows") == "Image Pixel & Contrast Module"

def test_enrich_and_group_tags():
    raw_tags = [
        {"tag": "(0010,0010)", "vr": "PN", "keyword": "PatientName", "name": "Patient's Name", "value": "DOE^JOHN"},
        {"tag": "(0028,0010)", "vr": "US", "keyword": "Rows", "name": "Rows", "value": "512"}
    ]
    grouped = enrich_and_group_tags(raw_tags)
    assert "Patient Identification Module" in grouped
    assert "Image Pixel & Contrast Module" in grouped
    patient_tag = grouped["Patient Identification Module"][0]
    assert patient_tag["vr_description"] == "Person Name"

def test_phi_redaction_masking():
    tags = [
        {"tag": "(0010,0010)", "vr": "PN", "keyword": "PatientName", "name": "Patient's Name", "value": "REAL_NAME"},
        {"tag": "(0010,0020)", "vr": "LO", "keyword": "PatientID", "name": "Patient ID", "value": "MRN-12345"},
        {"tag": "(0028,0010)", "vr": "US", "keyword": "Rows", "name": "Rows", "value": "512"}
    ]
    redacted = apply_phi_redaction(tags, redact=True)
    assert redacted[0]["value"] == "ANONYMIZED^PATIENT"
    assert redacted[0]["redacted"] is True
    assert redacted[1]["value"] == "ANON-XXXX"
    assert redacted[2]["value"] == "512"
    assert redacted[2]["redacted"] is False

def test_phi_redaction_unmasked():
    tags = [
        {"tag": "(0010,0010)", "vr": "PN", "keyword": "PatientName", "name": "Patient's Name", "value": "REAL_NAME"}
    ]
    unmasked = apply_phi_redaction(tags, redact=False)
    assert unmasked[0]["value"] == "REAL_NAME"
    assert unmasked[0]["redacted"] is False

def test_metadata_endpoint_flow(client):
    db = SessionLocal()
    study_uid = "test_meta_study_123"
    from app.models.imaging import Patient
    patient = db.query(Patient).filter_by(id="SUBJ-TEST-1").first()
    if not patient:
        patient = Patient(id="SUBJ-TEST-1", pseudonym="TEST^PATIENT")
        db.add(patient)
        db.commit()

    existing = db.query(Study).filter_by(study_instance_uid=study_uid).first()
    if not existing:
        study = Study(
            study_instance_uid=study_uid,
            patient_id=patient.id,
            modalities="CT",
            study_description="TEST ABDOMEN CT"
        )
        db.add(study)
        db.commit()
    db.close()

    # Query with PHI redaction active
    resp = client.get(f"/api/v1/studies/{study_uid}/metadata?redact_phi=true")
    assert resp.status_code == 200
    data = resp.json()
    assert data["study_instance_uid"] == study_uid
    assert "modules" in data
    assert "Patient Identification Module" in data["modules"]
    assert data["redact_phi_active"] is True

def test_metadata_endpoint_404(client):
    resp = client.get("/api/v1/studies/non_existent_uid_9999/metadata")
    assert resp.status_code == 404
