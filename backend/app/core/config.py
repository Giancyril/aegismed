from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Medical Image Analysis Pipeline"
    API_V1_STR: str = "/api/v1"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Storage
    STORAGE_DIR: str = "storage"
    UPLOAD_DIR: str = "storage/uploads"
    NIFTI_DIR: str = "storage/nifti"
    MASKS_DIR: str = "storage/masks"
    
    # DB & Object Storage (Optional/Local fallback)
    DATABASE_URL: Optional[str] = "sqlite:///./medical_metadata.db"
    S3_ENDPOINT: Optional[str] = "http://localhost:9000"
    S3_ACCESS_KEY: Optional[str] = "minioadmin"
    S3_SECRET_KEY: Optional[str] = "minioadminpassword"
    S3_BUCKET: Optional[str] = "medical-imaging"
    
    # Inference Target
    MODAL_SERVING_URL: Optional[str] = None
    USE_MOCK_INFERENCE_IF_NO_GPU: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
