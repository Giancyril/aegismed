#!/bin/bash
# Conventional Commit Helper for Medical Image Analysis Pipeline
if [ -z "$1" ]; then
    echo "Usage: ./scripts/commit-stage.sh '<commit-message>'"
    exit 1
fi

git add -A
git commit -m "$1" || echo "Nothing to commit"
