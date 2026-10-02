# Security

See [the full security model](docs/SECURITY.md).

Please report security vulnerabilities privately through the repository’s security reporting channel where available. Include affected version/browser, a minimal reproduction and the impact. Do not post live credentials, private media capabilities or exploit scores in public discussions.

The runtime intentionally evaluates user JavaScript inside an opaque-origin sandbox. Public browsing never executes it. A hanging or resource-intensive score can still affect the visitor’s renderer; reload without pressing Play to recover the saved draft.
