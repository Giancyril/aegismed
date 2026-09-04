variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type    = string
  default = "staging"
}

variable "db_username" {
  type    = string
  default = "medical_admin"
}

variable "db_password" {
  type      = string
  sensitive = true
}
