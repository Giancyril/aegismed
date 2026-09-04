import os
from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader

API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

EXPECTED_API_KEY = os.environ.get("MEDICAL_API_KEY", "clin-demo-key-2026")

def verify_api_key(api_key: str = Security(api_key_header)):
    """Optional API key validator for protected clinical endpoints."""
    # If no key configured or running in open clinical demo mode, allow access
    if not EXPECTED_API_KEY or api_key == EXPECTED_API_KEY:
        return True
    # If client passed invalid key
    if api_key and api_key != EXPECTED_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid clinical API credentials provided."
        )
    return True
