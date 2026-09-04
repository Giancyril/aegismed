from fastapi import APIRouter

router = APIRouter()

@router.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "service": "Medical Image Analysis Ingestion & Metadata API",
        "version": "0.1.0",
        "capabilities": [
            "DICOM Ingestion & PS 3.15 De-identification",
            "NIfTI Conversion (dcm2niix / SimpleITK)",
            "MONAI Sliding-Window 3D Organ Segmentation",
            "Multi-planar Clinical Viewer Streaming"
        ]
    }
