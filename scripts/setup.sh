#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for executable in php node npm xxc-db-setup ffmpeg ffprobe redis-cli convert rsvg-convert; do command -v "$executable" >/dev/null || { echo "Missing required tool: $executable" >&2; exit 1; }; done
mkdir -p config docs storage/{samples,recordings,exports,covers,waveforms,cache,tmp,logs,sessions}
chmod 0750 config storage
if [ ! -f config/secrets.json ]; then
  umask 077
  xxc-db-setup strudel > config/db-setup.txt
  python3 scripts/configure.py
fi
./scripts/permissions.sh
./scripts/migrate.sh
python3 scripts/install-sample-banks.py
if [ -d assets/vjloops ]; then python3 scripts/install-vjloops.py; fi
./scripts/build.sh
./scripts/install-maintenance.sh
./scripts/healthcheck.sh
