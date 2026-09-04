terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# S3 Bucket for Raw DICOM Storage
resource "aws_s3_bucket" "raw_dicom" {
  bucket = "${var.environment}-medical-raw-dicom"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "raw_dicom_crypto" {
  bucket = aws_s3_bucket.raw_dicom.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# S3 Bucket for Preprocessed NIfTI Volumes
resource "aws_s3_bucket" "derived_nifti" {
  bucket = "${var.environment}-medical-derived-nifti"
}

# S3 Bucket for AI Segmentation Masks
resource "aws_s3_bucket" "segmentation_masks" {
  bucket = "${var.environment}-medical-segmentation-masks"
}

# PostgreSQL Database for Clinical Metadata
resource "aws_db_instance" "medical_db" {
  allocated_storage      = 20
  max_allocated_storage  = 100
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = "db.t4g.medium"
  db_name                = "medical_imaging_db"
  username               = var.db_username
  password               = var.db_password
  skip_final_snapshot    = true
  publicly_accessible    = false
}
