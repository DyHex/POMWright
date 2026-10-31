---
"pomwright": patch
---

The package's `exports` map has a `default` condition after `import` and `require`, pointing at the CommonJS build, as
`@playwright/test`'s map does. Node and TypeScript always matched `import` or `require`, so nothing changes for them; a
resolver that matches neither now finds the package instead of failing.
