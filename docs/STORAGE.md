# Storage and ownership

All uploaded and generated user media lives under `storage/`, outside Apache’s `html/` document root.

| Directory | Data | Automatic retention |
|---|---|---|
| `samples/` | Validated user audio | None |
| `recordings/` | Captured original takes | None |
| `exports/` | WAV/MP3/M4A derivatives | None |
| `covers/` | Generated PNG and SVG masters | None |
| `waveforms/` | Reserved derived waveform cache | Regenerable, currently browser-rendered |
| `tmp/` | ZIP staging / failed intermediates | Older than 24 hours |
| `cache/` | Rate-limit fallback files | Older than 48 hours |
| `sessions/` | Private PHP sessions | Expired after 24 hours |
| `logs/` | Structured application and private PHP logs | Daily rotation; 14 rotations |

Database media records hold the UUID, owner hash, optional project association, inspected MIME, generated storage filename, original display name, size/duration and author/source/license metadata. A filename provided by a visitor is never a filesystem path.

## Project files

Strudel and JSON source files are database text rows. Folder rows and relative paths represent explorer organization. They are never written as executable PHP or JavaScript server files. A project’s entry file must exist. Saves reject duplicate/traversal paths and enforce source size limits.

## Media access

A private asset is served only with the owner/admin cookie or a resource-specific timed signature. An opaque runtime gets only the signed asset URL. Reads of saved projects refresh their own sample URLs, so expired links do not require a manual code edit. Public/unlisted project media and enabled sample-pack members are link-readable when approved.

An administrator can unpublish media immediately, making the delivery endpoint return 404. Publishing a score with samples intentionally exposes those sample assets. Users should only publish media they have rights to share.

## Bundles and remixes

Project ZIPs contain `manifest.json` with format `xxc-strudel-project`, version `1`, title, entry file, project metadata and source files under `source/`. Associated project samples are included under `samples/`. The selected cover is included when present.

Import validates every path and size before reading source or staging individually inspected audio. It creates a new private project and remaps embedded media URLs to newly stored sample copies. A fork similarly creates a distinct project ID and copies associated samples. Recorded previews are separate assets and are not silently copied into another author’s remix.

## Permissions

Public directories/files: `www-data:www-data`, `0755`/`0644`. Storage directories/files: `www-data:www-data`, `0750`/`0640`. Private configuration: `root:www-data`, directory `0750`, secret file `0640`. Initial database setup output and administrator credential file: root-owned `0600`.

Run `./scripts/permissions.sh` after deployment. Never set world-write permissions or expose `storage/` through an Apache alias.
