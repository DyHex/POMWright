---
"pomwright": patch
---

A `SessionStorage` with an origin (every page object's) now also refuses to touch another origin on a page at
`about:blank` whose document inherited that origin, as a popup from `window.open()` does:
`… the page (about:blank) is on https://login.example, not on this page object's origin https://shop.example; …`.
Before, the check saw no origin in the URL and let the helper write into the inherited origin's storage.
