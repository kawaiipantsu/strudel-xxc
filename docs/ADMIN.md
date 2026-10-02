# Administrator guide

Open `https://strudel.xxc.dk/admin/`. Read the initial access code privately from `docs/ADMIN_CREDS.md`. The username is `admin`. Never copy the access code into a Git commit, issue, discussion or application log.

## Sections

- **Dashboard:** project/revision/media counts, public project count, storage bytes, recent activity and service health.
- **Global settings:** titles, banner, maintenance state, defaults, upload/recording limits, publishing and integration preferences. The canonical public origin is fixed for this deployment.
- **Library / Projects / Music:** inspect source without executing it, edit title/description/author/tags, change visibility, feature/unfeature, record moderation notes, download or remove projects.
- **Samples / Media:** inspect audio, MIME, size, duration and supplied license/source; approve/unpublish or permanently delete media. Covers have a preview. Unattached assets are shown explicitly.
- **Sample packs:** create/edit curated groups, licensing notes, enabled state and sample membership. Enabled pack media is publicly readable.
- **Authors:** a summary of project display names. There are no public login accounts.
- **Theming:** validated hex colors, dark/light surfaces, theme and visual defaults. Arbitrary CSS is not accepted.
- **System:** PHP/module diagnostics, database/Redis/FFmpeg health, disk space, build/engine versions and source/operations links.
- **Logs:** structured non-secret application events, last 100 entries.

Visibility changes are immediate. Unlisted scores are readable by anyone with the link, carry `noindex`, and stay out of the sitemap. Private scores are visible only to their owning browser and administrators. Removing a project does not automatically erase associated media; this avoids destroying legitimate assets during moderation. Delete media explicitly after reviewing it.

Sessions expire after eight hours. Login attempts are rate limited. Sign out when finished; the admin shell and runtime never share execution context.

## Rotate access

Run `php scripts/rotate-admin.php` on the host, then `./scripts/permissions.sh`. The command prints no password. Read the newly generated private credential file through the secure administration channel you use for the server.

## Defaults and limits

A blank `default_project` opens the bundled starter. To use another score for first-time visitors, enter a public project's UUID. Existing local drafts take priority. Theme defaults apply until a visitor chooses Dark, Light or System in Preferences. Visual defaults likewise preserve a visitor's saved settings.

The canonical HTTPS origin stays fixed because cookies, the isolated runtime message boundary and generated links depend on it. Changing hosts requires a coordinated deployment change, not just editing a text field. MIDI/Hydra preferences control the supported UI integrations; they are not a JavaScript security boundary.
