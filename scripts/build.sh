#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm ci --ignore-scripts
python3 scripts/generate-samples.py
python3 scripts/graphics.py
npm run licenses
npm run build
./scripts/permissions.sh
