---
"pomwright": patch
---

A locator method that throws because its path is registered already leaves the registration as it was, so calling it
again reports the same error, not "has already been provided":

```text
A locator schema with the path "main" already exists.
```

Before, the registration took the definition before the registry refused it, so a second call said
`A locator definition for "main" has already been provided; only one locator type can be set for a registration.`
for a locator that was never registered.
