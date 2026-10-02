#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Only committed application source. Gitignored secrets/runtime data cannot enter this archive.
git archive --format=tar.gz --prefix=xxc-strudel-source/ HEAD > storage/tmp/source.tar.gz
mv storage/tmp/source.tar.gz html/source.tar.gz
chown www-data:www-data html/source.tar.gz
chmod 0644 html/source.tar.gz
