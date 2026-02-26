---
"pomwright": patch
---

# Summary

This PR focuses on preventative quality improvements to v2 locator-registry typing and internal safety.

## What changed

- Refined compile-time diagnostics for invalid locator schema paths so errors are clearer and more actionable at the literal argument level.
- Hardened internal registry retrieval behavior (`get` / `getIfExists`) for safer, more predictable handling of missing paths and record cloning semantics.
- Added both compile-time and runtime guards to reject path-based reuse when the source path equals the target registration path `registry.add(path, { reuse: path })`.
