---
"pomwright": minor
---

# v1.4.0

## Removed

- Dropped deprecated locator schema helpers (legacy numeric indexing and update/updates overloads). Use sub-path keyed indices and `update(subPath, updates)` instead.

## Changed

- Simplified nested locator debug logging to count-only checks to avoid CSP-restricted pages failing when `evaluateAll` is blocked.
