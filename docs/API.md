# API

Base path: `/api/`. All JSON responses have `{ "ok": true, "data": ..., "error": null }` or `{ "ok": false, "data": null, "error": { "code": "...", "message": "..." } }`.

Use `GET /api/session` to establish the secure browser session and obtain its CSRF token. Send that token as `X-CSRF-Token` on all writes. Requests must originate from `https://strudel.xxc.dk`. Session and owner cookies are HttpOnly and Secure. Admin sessions use SameSite Strict; browser ownership uses SameSite Lax. The API exposes no general cross-origin access.

| Method / route | Behavior |
|---|---|
| `GET health` | Safe service diagnostics |
| `GET session` | CSRF bootstrap and admin state |
| `GET settings/public` | Non-secret studio preferences |
| `GET projects` | Owning browser’s project list |
| `POST projects` | Create validated project |
| `GET projects/{uuid}` | Owner/private or public/unlisted read |
| `PUT projects/{uuid}` | Full source/metadata save, requires current `version` |
| `DELETE projects/{uuid}` | Owner/admin project removal |
| `POST projects/{uuid}/fork` | New project identity and sample copies with provenance |
| `GET projects/{uuid}/revisions` | Owner/admin checkpoints |
| `POST projects/{uuid}/revisions` | `{id}` reads snapshot; `{id,action:"restore"}` restores |
| `GET projects/{uuid}/bundle` | ZIP attachment with manifest, source and project samples |
| `POST projects/import` | Multipart `file`: validated ZIP import |
| `POST projects/{uuid}/cover` | `{style,wave?}` generates SVG and PNG |
| `POST projects/{uuid}/preview` | `{id}` sets a recording/export as preview |
| `GET projects/{uuid}/sample-map` | Named media URL map |
| `GET library?search=&tag=&sort=` | Public scores, newest or updated sort |
| `GET samples`, `recordings`, `exports` | Owning browser’s media |
| `POST samples`, `recordings` | Multipart `file`, optional `project_id`, `license`, `author`, `source` |
| `POST exports` | `{recording_id,format,title,artist,comment}`; format `wav`, `mp3`, `m4a` |
| `DELETE samples/{id}`, `recordings/{id}`, `exports/{id}`, `covers/{id}` | Owner/admin media removal |
| `GET sample-packs` | Enabled curated packs and maps |
| `POST admin/login` | `{username,password}`; rotates session/CSRF token |
| `POST admin/logout` | End administrator session |
| `GET admin/dashboard` | Counts, service health and recent activity |
| `GET/PUT admin/settings` | Read/update validated settings |
| `GET/PATCH admin/projects` | Listing, visibility, featured state and moderation notes |
| `GET/PATCH/DELETE admin/media` | Listing, approval state and explicit removal |
| `GET/POST admin/sample-packs` | Pack metadata and members |
| `GET admin/logs` | Redacted structured log entries |

Public share HTML is `/p/{slug}`; public library HTML is `/library`; the sitemap is `/sitemap.xml`.

## Project payload

```json
{
  "title": "My set",
  "description": "An original score",
  "author": "Display name",
  "visibility": "private",
  "entry_file": "main.strudel",
  "version": 2,
  "tags": ["minimal"],
  "metadata": {"bpm": 120},
  "files": [{"path": "main.strudel", "kind": "file", "content": "s(\"bd*4\")"}]
}
```

A create does not need a version. Updates require the version returned by the preceding read/save. A stale version returns `409 VERSION_CONFLICT`. File paths must be relative, unique and traversal-free. Maximum source size is 1 MB, maximum JSON request 2 MB, maximum 100 files.

## Media delivery

`GET /media/{uuid}` accepts a public media ID, an owning/admin cookie, or a timed HMAC URL. Supports a single RFC-style byte range, suffix ranges and HEAD. `?download=1` adds an attachment disposition; covers accept `?format=svg`. MIME is stored from inspection, never inferred from a user filename.

Private sample URLs expire after 24 hours and are refreshed when their project is read. Public/unlisted project media and enabled pack samples have stable URLs. Treat a signed URL as a limited bearer capability; do not paste private sample links into public issue reports.

## Limits and errors

Status codes include 400 validation, 401 admin authentication, 403 CSRF/origin/publishing checks, 404 inaccessible entity, 409 conflict/busy, 413 size/quota, 415 invalid audio, 429 rate limit, 503 maintenance and 507 low disk space. Internal failures return a reference ID, never raw exception details.

Rates combine owner and client-IP counters. Login throttling is IP-based. FFmpeg jobs use Redis locks and timeouts; uploads and media conversions have additional limits. The host’s upstream request controls also apply.

### Forking with edits

`POST /api/projects/{id}/fork` accepts `{}` to copy a score, or a complete project document to preserve local edits while making a remix. It creates a private project, records provenance, copies approved project samples and rewrites their media references. Read-only scores follow this path when first saved.

### Source access

The running application links the public Git repository. `/source.tar.gz` is an additional archive of committed application source created by `scripts/package-source.sh`; it excludes all ignored secrets and user data. The repository and package lock identify the complete corresponding build inputs.
