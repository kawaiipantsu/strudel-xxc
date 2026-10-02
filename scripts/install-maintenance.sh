#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
app_dir=$(pwd)
backup_dir="$app_dir/storage/config-backups"
install -d -m 0700 "$backup_dir"
for file in /etc/cron.d/xxc-strudel-cleanup /etc/logrotate.d/xxc-strudel; do
  if [ -f "$file" ]; then cp -p "$file" "$backup_dir/$(basename "$file").$(date +%s).bak"; fi
done
cat > /etc/cron.d/xxc-strudel-cleanup <<CRON
SHELL=/bin/sh
PATH=/usr/bin:/bin
17 * * * * www-data cd $app_dir && /usr/bin/php scripts/cleanup.php >> storage/logs/cleanup.log 2>&1
CRON
cat > /etc/logrotate.d/xxc-strudel <<ROTATE
$app_dir/storage/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
    su www-data www-data
}
ROTATE
chown root:root /etc/cron.d/xxc-strudel-cleanup /etc/logrotate.d/xxc-strudel
chmod 0644 /etc/cron.d/xxc-strudel-cleanup /etc/logrotate.d/xxc-strudel
printf '%s\n' 'Installed the cleanup cron and application log rotation.'
