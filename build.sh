#! /bin/bash

PROJECT_ID=digital-ucdavis-edu
GCR_PROJECT_ID=ucdlib-pubreg

CONTAINER_NAME=open-kafka
BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)
TAG_NAME=$(git describe --tags --abbrev=0)

IMAGE=gcr.io/$GCR_PROJECT_ID/$CONTAINER_NAME:$TAG_NAME

gcloud config set project $PROJECT_ID
gcloud builds submit --tag $IMAGE