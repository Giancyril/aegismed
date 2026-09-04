import io
import pytest
import numpy as np
from fastapi.testclient import TestClient
from main import app
from app.services.organ_metrics import compute_organ_morphometrics, evaluate_clinical_risk
from app.services.report_generator import generate_radiology_report_pdf
from app.core.database import SessionLocal
from app.models.imaging import ProcessingJob, Series, Study, Patient

@pytest.fixture
def client():
    return TestClient(app)

def test_organ_morphometrics_calculation():
    # 50x50x50 cube with label 1 (Liver) of size 10x10x10 voxels = 1000 voxels
    # Spacing: 1.0, 1.0, 1.0 mm -> 1000 mm3 = 1.0 cm3
    mask = np.zeros((50, 50, 50), dtype=np.int32)
    mask[10:20, 10:20, 10:20] = 1 # Liver
    mask[30:35, 30:35, 30:35] = 2 # Spleen (125 voxels = 0.125 cm3)

    metrics = compute_organ_morphometrics(mask, voxel_spacing_mm=[1.0, 1.0, 1.0])
    assert len(metrics) == 2
    liver = next(m for m in metrics if m["organ_name"] == "Liver")
    assert liver["voxel_count"] == 1000
    assert liver["volume_cm3"] == 1.0
    assert "bounding_box" in liver
    assert "sphericity" in liver

def test_clinical_risk_normal_ranges():
    normal_organs = [
        {"organ_name": "Liver", "volume_cm3": 1500.0},
        {"organ_name": "Spleen", "volume_cm3": 250.0},
        {"organ_name": "Kidneys", "volume_cm3": 350.0},
        {"organ_name": "Pancreas", "volume_cm3": 85.0}
    ]
    eval_res = evaluate_clinical_risk(normal_organs)
    assert eval_res["overall_risk_level"] == "NORMAL"
    assert eval_res["total_alerts"] == 0

def test_clinical_risk_splenomegaly_detection():
    abnormal_organs = [
        {"organ_name": "Liver", "volume_cm3": 1500.0},
        {"organ_name": "Spleen", "volume_cm3": 520.0} # > 350 max -> Alert
    ]
    eval_res = evaluate_clinical_risk(abnormal_organs)
    assert eval_res["overall_risk_level"] in ["MODERATE_ALERT", "HIGH_ALERT"]
    assert eval_res["total_alerts"] == 1
    assert eval_res["findings"][0]["finding"] == "Splenomegaly"

def test_reportlab_pdf_generator():
    patient_info = {"name": "TEST^SUBJECT", "id": "SUBJ-001"}
    study_info = {"description": "CT ABDOMEN/PELVIS", "modality": "CT", "date": "2026-09-04"}
    risk_evaluation = {
        "overall_risk_level": "NORMAL",
        "findings": [],
        "evaluated_organs": [
            {"organ_name": "Liver", "volume_cm3": 1450.0, "clinical_status": "Normal", "sphericity": 0.82},
            {"organ_name": "Spleen", "volume_cm3": 240.0, "clinical_status": "Normal", "sphericity": 0.78}
        ]
    }
    pdf_bytes = generate_radiology_report_pdf(patient_info, study_info, risk_evaluation)
    assert isinstance(pdf_bytes, bytes)
    assert pdf_bytes.startswith(b"%PDF")
    assert len(pdf_bytes) > 1500

def test_job_report_endpoints(client):
    db = SessionLocal()
    p_id = "SUBJ-REP-1"
    patient = db.query(Patient).filter_by(id=p_id).first()
    if not patient:
        patient = Patient(id=p_id, pseudonym="REPORT^PATIENT")
        db.add(patient)
        db.commit()

    study_uid = "study_report_test_uid"
    study = db.query(Study).filter_by(study_instance_uid=study_uid).first()
    if not study:
        study = Study(study_instance_uid=study_uid, patient_id=patient.id, modalities="CT", study_description="CT ABDOMEN REPORT")
        db.add(study)
        db.commit()

    series_uid = "series_report_test_uid"
    series = db.query(Series).filter_by(series_instance_uid=series_uid).first()
    if not series:
        series = Series(
            series_instance_uid=series_uid,
            study_instance_uid=study_uid,
            modality="CT",
            series_number=1,
            series_description="CT ABDOMEN REPORT",
            raw_storage_dir="storage/test_rep"
        )
        db.add(series)
        db.commit()

    job_id = "job_report_test_456"
    job = db.query(ProcessingJob).filter_by(job_id=job_id).first()
    if not job:
        job = ProcessingJob(
            job_id=job_id,
            series_instance_uid=series_uid,
            status="completed",
            progress=100,
            message="Segmentation complete"
        )
        db.add(job)
        db.commit()
    db.close()

    # 1. Test metrics summary endpoint
    summary_res = client.get(f"/api/v1/jobs/{job_id}/metrics/summary")
    assert summary_res.status_code == 200
    s_data = summary_res.json()
    assert "overall_risk_level" in s_data
    assert "evaluated_organs" in s_data

    # 2. Test PDF report download endpoint
    report_res = client.get(f"/api/v1/jobs/{job_id}/report")
    assert report_res.status_code == 200
    assert report_res.headers["content-type"] == "application/pdf"
    assert report_res.content.startswith(b"%PDF")
