import uuid
from typing import List, Optional, Any, Dict
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.imaging import Annotation, Series

router = APIRouter(tags=["Annotations & Measurements"])

class AnnotationCreate(BaseModel):
    series_instance_uid: str
    slice_index: int = 0
    plane: str = "axial"
    annotation_type: str # "caliper", "polygon", "angle"
    label: Optional[str] = None
    unit: str = "mm"
    measurement_value: float
    geometry: Dict[str, Any]
    color: str = "#10b981"

class AnnotationUpdate(BaseModel):
    label: Optional[str] = None
    color: Optional[str] = None
    measurement_value: Optional[float] = None

@router.post("/annotations", status_code=201)
def create_annotation(payload: AnnotationCreate, db: Session = Depends(get_db)):
    """Persists a new clinical measurement (caliper, area, angle) to the study database."""
    series = db.query(Series).filter_by(series_instance_uid=payload.series_instance_uid).first()
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")

    ann_id = f"ann_{uuid.uuid4().hex[:12]}"
    annotation = Annotation(
        id=ann_id,
        series_instance_uid=payload.series_instance_uid,
        slice_index=payload.slice_index,
        plane=payload.plane,
        annotation_type=payload.annotation_type,
        label=payload.label or f"{payload.annotation_type.capitalize()} Measurement",
        unit=payload.unit,
        measurement_value=payload.measurement_value,
        geometry=payload.geometry,
        color=payload.color
    )
    db.add(annotation)
    db.commit()
    db.refresh(annotation)

    return {
        "id": annotation.id,
        "series_instance_uid": annotation.series_instance_uid,
        "slice_index": annotation.slice_index,
        "plane": annotation.plane,
        "annotation_type": annotation.annotation_type,
        "label": annotation.label,
        "unit": annotation.unit,
        "measurement_value": annotation.measurement_value,
        "geometry": annotation.geometry,
        "color": annotation.color,
        "created_at": annotation.created_at.isoformat() if annotation.created_at else None
    }

@router.get("/series/{series_instance_uid}/annotations")
def get_series_annotations(series_instance_uid: str, db: Session = Depends(get_db)):
    """Retrieves all annotations associated with a specific series."""
    annotations = db.query(Annotation).filter_by(series_instance_uid=series_instance_uid).all()
    return [
        {
            "id": a.id,
            "series_instance_uid": a.series_instance_uid,
            "slice_index": a.slice_index,
            "plane": a.plane,
            "annotation_type": a.annotation_type,
            "label": a.label,
            "unit": a.unit,
            "measurement_value": a.measurement_value,
            "geometry": a.geometry,
            "color": a.color,
            "created_at": a.created_at.isoformat() if a.created_at else None
        }
        for a in annotations
    ]

@router.patch("/annotations/{annotation_id}")
def update_annotation(annotation_id: str, payload: AnnotationUpdate, db: Session = Depends(get_db)):
    """Updates label, measurement, or display color of an existing annotation."""
    ann = db.query(Annotation).filter_by(id=annotation_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Annotation not found")

    if payload.label is not None:
        ann.label = payload.label
    if payload.color is not None:
        ann.color = payload.color
    if payload.measurement_value is not None:
        ann.measurement_value = payload.measurement_value

    db.commit()
    return {
        "id": ann.id,
        "status": "updated",
        "label": ann.label,
        "color": ann.color,
        "measurement_value": ann.measurement_value
    }

@router.delete("/annotations/{annotation_id}")
def delete_annotation(annotation_id: str, db: Session = Depends(get_db)):
    """Deletes an annotation from the series."""
    ann = db.query(Annotation).filter_by(id=annotation_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Annotation not found")

    db.delete(ann)
    db.commit()
    return {"status": "deleted", "id": annotation_id}
