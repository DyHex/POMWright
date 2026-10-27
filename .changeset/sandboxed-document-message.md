---
"pomwright": patch
---

On a document whose own origin is opaque, such as one served with `Content-Security-Policy: sandbox` without
`allow-same-origin`, or the error page Firefox shows at the origin's URL after a failed navigation, `set`, `get`,
`clear` and an on-origin `seed` fail with
`Shop.SessionStorage.set: the document at … cannot use sessionStorage: its origin is opaque (the browser's error page after a failed navigation, or a sandboxed document: Content-Security-Policy: sandbox without allow-same-origin)`
on every browser. Before, Chromium and WebKit said "the page has no origin yet … or use seed()", also from `seed`, and
Firefox gave the browser's error without the helper's label. `seed` on a page without an origin no longer suggests
`seed()`.
