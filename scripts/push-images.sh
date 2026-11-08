#!/usr/bin/env bash
# Build and push the application images to Docker Hub.
# Usage: ./scripts/push-images.sh <dockerhub-username> [tag]
# Run from the repository root. Requires `docker login` done beforehand.
set -euo pipefail

DOCKER_USER=${1:?usage: push-images.sh <dockerhub-username> [tag]}
TAG=${2:-latest}

cd "$(dirname "$0")/.."

build_and_push() {
  local name=$1 dockerfile=$2
  docker build -t "docker.io/${DOCKER_USER}/${name}:${TAG}" -f "$dockerfile" .
  docker push "docker.io/${DOCKER_USER}/${name}:${TAG}"
}

build_and_push vibes-frontend frontend/vibes-frontend/Dockerfile
build_and_push auth-service   services/auth-service/Dockerfile
build_and_push chat-service   services/chat-service/Dockerfile

# auth-db/chat-db are not pushed: both run the stock postgres:15 image, with
# their init.sql injected via ConfigMap and credentials via Secret.

echo "Done. Images pushed as docker.io/${DOCKER_USER}/{vibes-frontend,auth-service,chat-service}:${TAG}"
