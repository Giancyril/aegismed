output "raw_dicom_bucket" {
  value = aws_s3_bucket.raw_dicom.bucket
}

output "derived_nifti_bucket" {
  value = aws_s3_bucket.derived_nifti.bucket
}

output "masks_bucket" {
  value = aws_s3_bucket.segmentation_masks.bucket
}

output "db_endpoint" {
  value = aws_db_instance.medical_db.endpoint
}
