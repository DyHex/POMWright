---
"pomwright": patch
---

A seed that the document arriving at its origin does not write now fails the test at the `seed` line instead of
passing silently. After a navigation to the origin that failed (a refused connection, offline, `route.abort()`),
Chromium counts the retry as a return to the origin, so the app started without the entries and the test went on;
it now fails with `… was not applied: the browser counted the page's arrival on … as a return there …`. Firefox shows
its error page at the origin's URL and failed with a refused-write message although no app had loaded; it now fails
with `… was not applied: the document that arrived on … has an opaque origin …`. The seed script never writes into a
browser's error page. WebKit applies the seed on the next arrival, as before. A retry is not attempted: a failed
navigation to a seeded origin fails the test.
