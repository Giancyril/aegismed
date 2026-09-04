import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String(64), primary_key=True, index=True) # Deterministic anonymized hash
    pseudonym = Column(String(128), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    studies = relationship("Study", back_populates="patient", cascade="all, delete-orphan")

class Study(Base):
    __tablename__ = "studies"

    study_instance_uid = Column(String(128), primary_key=True, index=True)
    patient_id = Column(String(64), ForeignKey("patients.id"), nullable=False)
    study_date = Column(String(32), nullable=True)
    study_description = Column(String(255), nullable=True)
    modalities = Column(String(64), default="CT")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship("Patient", back_populates="studies")
    series = relationship("Series", back_populates="study", cascade="all, delete-orphan")

class Series(Base):
    __tablename__ = "series"

    series_instance_uid = Column(String(128), primary_key=True, index=True)
    study_instance_uid = Column(String(128), ForeignKey("studies.study_instance_uid"), nullable=False)
    series_number = Column(Integer, default=1)
    series_description = Column(String(255), default="Unnamed Series")
    modality = Column(String(16), default="CT")
    num_instances = Column(Integer, default=0)
    slice_thickness = Column(Float, nullable=True)
    pixel_spacing = Column(String(64), nullable=True)
    rows = Column(Integer, nullable=True)
    columns = Column(Integer, nullable=True)
    raw_storage_dir = Column(String(512), nullable=False)
    nifti_volume_path = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    study = relationship("Study", back_populates="series")
    instances = relationship("Instance", back_populates="series", cascade="all, delete-orphan")
    annotations = relationship("Annotation", back_populates="series", cascade="all, delete-orphan")
    jobs = relationship("ProcessingJob", back_populates="series", cascade="all, delete-orphan")

class Instance(Base):
    __tablename__ = "instances"

    sop_instance_uid = Column(String(128), primary_key=True, index=True)
    series_instance_uid = Column(String(128), ForeignKey("series.series_instance_uid"), nullable=False)
    instance_number = Column(Integer, default=1)
    slice_location = Column(Float, nullable=True)
    file_path = Column(String(512), nullable=False)

    series = relationship("Series", back_populates="instances")

class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    job_id = Column(String(64), primary_key=True, index=True)
    series_instance_uid = Column(String(128), ForeignKey("series.series_instance_uid"), nullable=False)
    model_name = Column(String(64), default="spleen_ct_segmentation")
    status = Column(String(32), default="queued") # queued, preprocessing, inferring, completed, failed
    progress = Column(Integer, default=0)
    message = Column(Text, default="Job queued")
    error = Column(Text, nullable=True)
    mask_nifti_path = Column(String(512), nullable=True)
    metrics = Column(JSON, nullable=True) # volume cm3, dice, latency
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    series = relationship("Series", back_populates="jobs")

class Annotation(Base):
    __tablename__ = "annotations"

    id = Column(String(64), primary_key=True, index=True)
    series_instance_uid = Column(String(128), ForeignKey("series.series_instance_uid"), nullable=False)
    slice_index = Column(Integer, default=0)
    plane = Column(String(32), default="axial")
    annotation_type = Column(String(32), nullable=False) # caliper, polygon, angle
    label = Column(String(128), nullable=True)
    unit = Column(String(16), default="mm")
    measurement_value = Column(Float, nullable=False)
    geometry = Column(JSON, nullable=False)
    color = Column(String(32), default="#10b981")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    series = relationship("Series", back_populates="annotations")
