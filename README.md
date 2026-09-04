# Medical Image Analysis Pipeline

AI-powered pipeline for processing and analyzing medical imaging data.
**Core Capabilities**: DICOM Ingestion & Validation → MONAI Preprocessing → GPU/Serverless Inference → Interactive Clinical 3-Panel Cornerstone3D Visualization.

## Architecture

- **Backend (`/backend`)**: FastAPI, pydicom, Celery, PostgreSQL metadata store, S3/MinIO volume storage.
- **Inference (`/inference`)**: NVIDIA MONAI transform chain, sliding-window inferer, Modal serverless GPU runner.
- **Frontend (`/frontend`)**: React + TypeScript + Cornerstone3D + Tailwind CSS clinical dark theme.
- **Infrastructure (`/infra`)**: Docker Compose orchestration for Postgres, Redis, and MinIO.

## Getting Started

### Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Local Services (Docker)
```bash
docker-compose -f infra/docker-compose.yml up -d
```
