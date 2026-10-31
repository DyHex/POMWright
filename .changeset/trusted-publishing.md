---
"pomwright": patch
---

Releases are published with npm Trusted Publishing: npm authenticates the GitHub Actions workflow that publishes, so the
workflow uses no npm token, and records the provenance of each version from that workflow.

3.0.0 and 3.0.1 were published without a provenance attestation, although the 3.0.0 entry said releases are published
with npm provenance. `npm view pomwright@<version> dist --json` shows whether a version has one.
