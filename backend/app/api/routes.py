from fastapi import APIRouter
from app.api.ingestion import router as ingestion_router
from app.api.jobs import router as jobs_router
from app.api.metadata import router as metadata_router
from app.api.volumes import router as volumes_router

router = APIRouter()

router.include_router(ingestion_router)
router.include_router(jobs_router)
router.include_router(metadata_router)
router.include_router(volumes_router)

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
            "Modal Serverless GPU Serving",
            "Multi-planar Clinical Viewer Streaming"
        ]
    }
