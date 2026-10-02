# Security model

## Executable scores

A Strudel score is JavaScript. The application intentionally executes it through the official transpiler and runtime. It is not a safe declarative file format.

The editor/runtime is an opaque-origin iframe with only `allow-scripts`. CSP also enforces the same sandbox on direct navigation. The frame cannot read the parent DOM, storage, cookies or CSRF token; it cannot navigate the top-level page, submit forms, open popups or access the admin context. Main/admin pages allow only self-hosted scripts and never include `unsafe-eval`. The isolated runtime permits dynamic evaluation, HTTPS modules and data/blob worklet modules required by upstream packages, including Safari.

The host checks `event.source`, opaque origin, channel and message type. Runtime code changes are plain text rendered by React/CodeMirror, never inserted as HTML. There is no message that grants an administrator session or returns an arbitrary API response. Recording blobs are bounded before preview; persistence still requires explicit user actions and server-side validation. MIDI output is available only after an explicit trusted UI permission grant, only for connected outputs, and excludes system-exclusive data.

Public share/library pages never automatically evaluate code. On a project share page, **Play** explicitly fetches the current public/unlisted entry file and mounts the same opaque-origin runtime in player mode. The host sends only source, filename, feature flags and playback settings. Stop destroys the frame, including pending audio unlocks and user timers. The share page does not save or change the project. Opening a project in the studio loads source into the editor without running it. Local drafts also load without execution after a crash or refresh.

The frame can access external HTTPS resources allowed by its CSP. Evaluated JavaScript can use CPU, make network requests and potentially hang its renderer. This boundary is for privilege separation, not a guarantee against denial of service in the visitor’s own browser. Read an unfamiliar score before playing it. Browser resource limits and iframe reload remain the recovery path.

## Sessions, ownership and CSRF

- All cookies are explicitly Secure even though local PHP sees HTTP.
- Session cookies are HttpOnly and SameSite Strict; strict session IDs and login regeneration prevent fixation.
- Admin authentication uses Argon2id hashes and eight-hour sessions. Only the initial private `0600` credentials document contains plaintext.
- Anonymous ownership uses a random 256-bit persistent HttpOnly cookie. It uses SameSite Lax so opening an external shared link does not replace the existing owner identity. Only its SHA-256 hash is stored with records.
- Writes require a session CSRF token and reject foreign Origin headers. Opaque runtime API requests cannot pass the origin/CSRF checks.
- Public/unlisted UUID/slug reads are intentional. Private objects return 404 to other owners. External IDs are random UUIDs; display slugs include a random suffix for community projects.
- PDO uses real parameterized prepared statements. User input is not concatenated into SQL identifiers or sort clauses; the few selectable clauses are whitelisted.

## Media and archives

Uploaded files never enter `html/`. Generated internal names contain only a random UUID and an inspected media extension. The display name is separate metadata. Server MIME inspection plus FFprobe verifies an audio stream and rejects non-audio streams, executable payloads and malformed input. User SVGs are not accepted. Covers are generated from escaped project data by server code; their PNG representation is generated with librsvg.

Media responses set the stored MIME, `nosniff`, a restrictive media CSP and bounded single-range support. A private URL carries a resource-specific 24-hour HMAC capability. It exposes one media item, not an API/session credential. Project reads renew private sample URLs. A published/unlisted project deliberately makes its associated approved media link-readable; enabled curated packs also publish their approved members.

ZIP import never calls general extraction. Every archive path, link attribute, entry size, expanded total and manifest version is inspected. Only source JSON/text and individually validated audio bytes are read. Limits are 200 entries, 32 MB per expanded entry, 128 MB expanded total and 64 MB compressed upload. Traversal, absolute paths, duplicate source paths and symlinks are rejected. Unreferenced ZIP files are not executed or installed.

FFmpeg uses an argument array with generated paths, protocol whitelist `file`, explicit codecs/maps, bounded duration, two encoding threads and a process timeout. Filenames and metadata are never interpolated into a shell command. Conversions have a Redis lock. Temporary artifacts are removed on failure or by transient cleanup.

## Abuse limits

Redis counters limit reads/writes, logins, project creation, uploads and exports. Write/upload/create/export limits combine browser ownership with client-IP limits. A locked-file fallback preserves throttling when Redis is down. Owner media quotas and free-space checks add storage bounds. These are practical controls for an anonymous creative tool, not a substitute for host monitoring or moderation.

The application uses Apache’s `REMOTE_ADDR` as configured by the existing trusted proxy chain. It does not interpret arbitrary `X-Forwarded-For` as a trusted client identity. It does not perform scheme redirects using PHP’s local TLS state.

## Disclosure and operations

Report a reproducible security issue privately through the repository’s security reporting channel when available. Do not post credentials, private sample capability URLs or unreviewed exploit scores into public discussions. Production errors return reference IDs; structured logs omit credentials and tokens. Private raw logs and backups remain outside the web root.

The AGPL source is deliberately public. The private database configuration, admin credential file, runtime storage and test sessions are excluded from Git and from source archives.
