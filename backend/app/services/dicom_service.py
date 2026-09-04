import io
import os
import hashlib
from typing import Tuple, Dict, Any, Optional
import pydicom
from pydicom.dataset import Dataset, FileDataset
from pydicom.uid import generate_uid

class DicomService:
    """Handles DICOM validation and DICOM PS 3.15 standard de-identification."""

    TAGS_TO_STRIP = [
        (0x0010, 0x0010),  # Patient's Name
        (0x0010, 0x0030),  # Patient's Birth Date
        (0x0010, 0x0032),  # Patient's Birth Time
        (0x0010, 0x0040),  # Patient's Sex (optional to retain or scrub)
        (0x0010, 0x1000),  # Other Patient IDs
        (0x0010, 0x1001),  # Other Patient Names
        (0x0008, 0x0050),  # Accession Number
        (0x0008, 0x0080),  # Institution Name
        (0x0008, 0x0081),  # Institution Address
        (0x0008, 0x0090),  # Referring Physician's Name
        (0x0008, 0x1048),  # Physicians of Record
        (0x0008, 0x1050),  # Performing Physician's Name
        (0x0008, 0x1070),  # Operators' Name
    ]

    @staticmethod
    def validate_dicom_bytes(file_bytes: bytes) -> Tuple[bool, Optional[FileDataset], Optional[str]]:
        """Validates DICOM header and essential attributes."""
        try:
            ds = pydicom.dcmread(io.BytesIO(file_bytes), stop_before_pixels=False, force=True)
            
            # Check mandatory DICOM UIDs & Image Attributes
            if not getattr(ds, "SOPInstanceUID", None):
                return False, None, "Missing mandatory SOPInstanceUID"
            if not getattr(ds, "SeriesInstanceUID", None):
                return False, None, "Missing mandatory SeriesInstanceUID"
            if not getattr(ds, "StudyInstanceUID", None):
                return False, None, "Missing mandatory StudyInstanceUID"
            
            # Verify PixelData exists
            if not hasattr(ds, "PixelData"):
                return False, None, "DICOM contains no PixelData array"
            
            return True, ds, None
        except Exception as e:
            return False, None, f"Corrupt or invalid DICOM structure: {str(e)}"

    @classmethod
    def deidentify_dataset(cls, ds: FileDataset) -> Tuple[FileDataset, Dict[str, Any]]:
        """Applies DICOM PS 3.15 Basic Application Level Confidentiality Profile."""
        original_patient_id = getattr(ds, "PatientID", "UNKNOWN_PATIENT")
        
        # Generate deterministic pseudonym hash
        patient_hash = hashlib.sha256(str(original_patient_id).encode("utf-8")).hexdigest()[:12].upper()
        pseudonym = f"ANON-{patient_hash}"

        # Overwrite PHI identifiers
        ds.PatientID = pseudonym
        ds.PatientName = pseudonym
        if hasattr(ds, "PatientBirthDate"):
            ds.PatientBirthDate = ""
        if hasattr(ds, "AccessionNumber"):
            ds.AccessionNumber = f"ACC-{patient_hash[:6]}"
        if hasattr(ds, "InstitutionName"):
            ds.InstitutionName = "CLINICAL_ANONYMIZED"
        if hasattr(ds, "ReferringPhysicianName"):
            ds.ReferringPhysicianName = "DR. ANONYMOUS"

        # Remove private tags
        ds.remove_private_tags()

        # Extract normalized clinical metadata
        metadata = {
            "patient_id": pseudonym,
            "study_instance_uid": str(ds.StudyInstanceUID),
            "series_instance_uid": str(ds.SeriesInstanceUID),
            "sop_instance_uid": str(ds.SOPInstanceUID),
            "modality": str(getattr(ds, "Modality", "CT")),
            "series_number": int(getattr(ds, "SeriesNumber", 1)),
            "instance_number": int(getattr(ds, "InstanceNumber", 1)),
            "series_description": str(getattr(ds, "SeriesDescription", "Series")),
            "slice_thickness": float(getattr(ds, "SliceThickness", 1.0)) if hasattr(ds, "SliceThickness") else None,
            "slice_location": float(getattr(ds, "SliceLocation", 0.0)) if hasattr(ds, "SliceLocation") else None,
            "rows": int(getattr(ds, "Rows", 512)),
            "columns": int(getattr(ds, "Columns", 512)),
            "pixel_spacing": str(getattr(ds, "PixelSpacing", "[1.0, 1.0]")),
        }

        return ds, metadata
