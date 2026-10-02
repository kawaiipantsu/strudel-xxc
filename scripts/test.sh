#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
find backend html scripts -name '*.php' -print0 | xargs -0 -n1 php -l
npm test
python3 tests/backend-smoke.py
python3 tests/sample-banks-http.py
python3 tests/vjloops-import.py
python3 tests/vjloops-http.py
npm run test:e2e
./scripts/healthcheck.sh
