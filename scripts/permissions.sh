#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
chown -R www-data:www-data html storage
find html -type d -exec chmod 0755 {} +
find html -type f -exec chmod 0644 {} +
find storage -type d -exec chmod 0750 {} +
find storage -type f -exec chmod 0640 {} +
# Installed system banks are read-only to PHP. User uploads use storage/samples.
if [ -d storage/sample-banks ]; then chown -R root:www-data storage/sample-banks; fi
if [ -d storage/vjloops ]; then chown -R root:www-data storage/vjloops; fi
chown root:www-data config
chmod 0750 config
if [ -f config/secrets.json ]; then chown root:www-data config/secrets.json; chmod 0640 config/secrets.json; fi
if [ -f config/db-setup.txt ]; then chown root:root config/db-setup.txt; chmod 0600 config/db-setup.txt; fi
if [ -f docs/ADMIN_CREDS.md ]; then chown root:root docs/ADMIN_CREDS.md; chmod 0600 docs/ADMIN_CREDS.md; fi

if [ -d storage/config-backups ]; then
  chown -R root:root storage/config-backups
  chmod 0700 storage/config-backups
  find storage/config-backups -type f -exec chmod 0600 {} +
fi
