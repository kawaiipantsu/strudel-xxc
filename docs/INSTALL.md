# Installation

## Deployment performed on this host

1. Inspected the empty vhost, Apache configuration and installed tools. The existing vhost document root is `/srv/www/vhosts-external/strudel.xxc.dk/html` on port 8080. No existing application files were removed.
2. Inspected THUGS(red), WAF and ASCIITRON, plus the official Strudel documentation and the published npm source packages.
3. Ran `xxc-db-setup strudel`. It created database `projects_strudel` with a dedicated database user. Its host/port/password were captured into private `config/secrets.json`; the raw result is private `config/db-setup.txt`. Neither is in Git.
4. Generated an application signing key and ran `php scripts/migrate.php`. The admin password is 48 random hex characters, stored only as an Argon2id hash in the database. The one-time plaintext is `docs/ADMIN_CREDS.md`, mode `0600`.
5. Installed pinned npm dependencies, generated original samples and SVG/PNG assets, built Vite assets, and seeded nine original examples.
6. Added application-local `.htaccess` rules and `.user.ini`. Apache’s existing vhost file was not replaced. `SymLinksIfOwnerMatch` is enabled locally because Apache requires it for rewrite rules with the host’s `-FollowSymLinks` setting.
7. Kept Redis and FFmpeg as existing host services/tools. Installed `libmanette-0.2-0` and `libenchant-2-2` (and their small dependencies) to run the WebKit test browser; these are test prerequisites, not an application backend.
8. Set public files to `www-data:www-data`, directories `0755`, files `0644`; private storage to `www-data:www-data`, directories `0750`, files `0640`; configuration to `root:www-data`, directory `0750`, secret file `0640`.

## Required host tools

PHP 8.4 with PDO MySQL, Redis, fileinfo, GD, ZIP, mbstring, JSON and sessions; MariaDB; Redis on localhost; FFmpeg/FFprobe and librsvg (`rsvg-convert`); Node/npm for builds; Python 3; ImageMagick for original static graphic rasterization. The deployed host already provided the production tools.

The font TTF and original SVG source are committed in `public/`, so future graphics builds do not require a font download. npm downloads are pinned by `package-lock.json`.

## Initial setup

On a prepared XXC host with `xxc-db-setup` and the vhost in place:

```bash
cd /srv/www/vhosts-external/strudel.xxc.dk
./scripts/setup.sh
```

This is idempotent with respect to existing configuration, tables and examples. The database provisioning command itself is not idempotent; setup only calls it if `config/secrets.json` is absent. Restore configuration from backup rather than rerunning provisioning against an existing database.

## Build, migrate, test

```bash
./scripts/migrate.sh
./scripts/build.sh
./scripts/healthcheck.sh
./scripts/test.sh
```

For browser testing, install the matching test browser once:

```bash
npx playwright install chromium webkit
```

Tests use Playwright’s matching Chromium and WebKit browsers. The system Chromium was also used during early verification. Browser tests run against the deployed HTTPS origin to exercise real proxy, cookie, CSP and media behavior. Integration tests use isolated sessions and should be run on a controlled deployment.

## Proxy and PHP details

Never redirect based solely on `$_SERVER['HTTPS']`: PHP sees proxied HTTP. The application generates HTTPS canonical URLs directly and sets Secure cookies explicitly. `.user.ini` configures FPM upload/post/memory/time limits without changing unrelated pools. FPM can cache these values for several minutes after deployment.

The verified cover renderer uses the existing `/usr/bin/rsvg-convert` to rasterize the generated SVG master, with the bundled JetBrains font selected by `backend/fonts.conf`.

No application systemd service, Node listener or persistent queue is installed. See [operations](OPERATIONS.md) for the narrow cleanup cron and log rotation.
