# Terraform google cloud multi tier deployment

# check how configure the provider here:
# https://www.terraform.io/docs/providers/google/index.html
provider "google" {
    credentials = file("<PATH_TO_CREDENTIALS_JSON>")
    project = var.GCP_PROJECT_ID
    zone = var.GCP_ZONE
}
