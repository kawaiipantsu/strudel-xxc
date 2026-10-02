# Operations

## Update procedure

```bash
cd /srv/www/vhosts-external/strudel.xxc.dk
git pull --ff-only
./scripts/migrate.sh
./scripts/build.sh
./scripts/package-source.sh
./scripts/healthcheck.sh
```

Run `./scripts/test.sh` for a complete verification. The build does not erase PHP entry points or runtime media. The service worker is versioned from active asset names and uses network-first requests. No release artifacts or GitHub Releases are needed for this web deployment.

The source archive is generated from the current committed revision, so commit and push reviewed changes before packaging it. `scripts/install-maintenance.sh` installs the cron/logrotate entries and backs up any existing files before changing them. Initial setup runs it automatically.

## Services and scheduled work

The application uses existing Apache/PHP-FPM, MariaDB and Redis services. It creates no new daemon. Media encoding runs in the request under a bounded `timeout` command, with a Redis lock and a maximum runtime of 75 seconds. Public preview playback does not invoke FFmpeg.

`/etc/cron.d/xxc-strudel-cleanup` runs `php scripts/cleanup.php` hourly as `www-data`. It removes only temporary files older than 24 hours, file-backed fallback rate counters older than 48 hours, and expired session files. It never removes saved project media. Media without a project is listed as unattached in Admin; deletion is manual.

`/etc/logrotate.d/xxc-strudel` rotates application/PHP logs daily, keeps 14 compressed rotations and uses `copytruncate`. Apache access/error log rotation remains under the host’s existing configuration.

## Backups

Back up the MariaDB database, `config/secrets.json`, `storage/samples`, `recordings`, `exports`, `covers`, and `docs/ADMIN_CREDS.md` securely. Do not publish those backups. Database dumps must use a protected MySQL option file or a backup service; never put the password on a command line. Back up source separately with Git.

Browser owners should export project ZIPs before clearing browser cookies. Anonymous ownership is not a password-based account and is not recoverable from a title alone. An administrator can inspect projects, but should not impersonate a visitor by distributing owner cookies.

## Credentials and sessions

```bash
php scripts/rotate-admin.php
./scripts/permissions.sh
```

Rotation updates the Argon2id hash, rewrites the private credential file and invalidates PHP sessions. The owner cookie used for anonymous projects is independent of the administrator session.

## Diagnostics

```bash
./scripts/healthcheck.sh
php scripts/cleanup.php
npm audit --omit=dev
```

`/api/health` returns booleans for database, Redis, writable storage and FFmpeg plus non-secret build information. Admin → System provides PHP modules and disk availability. Admin → Logs reads only the structured, redacted application log. Raw PHP logs are private filesystem diagnostics.

A failed API response includes an opaque reference UUID. Match it in `storage/logs/app.log`; public responses never contain exception details or database credentials.

## Limits

Default uploads are 32 MB with a 512 MB owner media quota. PHP accepts up to 128 MB per file, while Admin’s lower application limit is enforced by inspection. The default duration cap is 600 seconds, but float PCM recording stops sooner if its byte budget is reached. At 48 kHz stereo, 32 MB holds about 87 seconds. Increase the configured upload budget for longer takes; the UI still applies the earlier byte/duration limit. MP3/AAC are derived from the recorded PCM after upload.

Redis counters are short-lived. If Redis is unavailable, rate limiting uses private locked counter files; conversion still has a bounded process timeout. Monitor a Redis outage and restore the service promptly.

## Recovery

If a frontend build fails, existing hashed production assets remain. Correct the error and rerun the build. If a saved project conflicts with another tab, keep the local draft and make a fork or reload the newer project. Export that draft before clearing storage.

If a user score hangs the runtime, reload the studio. Scores never auto-run after reload. The browser retains the last local source draft.
