> Not filed (decided 2026-10-23, DECISIONS.md 34). Kept as the record of why the retry is not made to apply the seed.

**Title:** Apply a pending seed on the retry after a failed navigation to its origin

**Labels:** backlog

---

When a navigation to a seeded origin fails (a refused connection, `route.abort()`, offline) and the test retries it, Chromium and Firefox present the browser's error page as the retry's previous document: `navigation.activation.from` is the error page's history entry, whose URL is the failed one. The seed script takes a set `from` to mean "a return to the origin" and does not write. Since 3.0.2 that fails the test at the `seed` line instead of passing without the entries.

Making the plain retry apply the seed would need the registry to listen to `request` and `requestfailed`, to treat the main-frame commit after a failed navigation as the error page (Firefox commits it at the origin's URL), and to re-register the script so that it accepts the error page's entry as `from`. Each of those rests on browser behaviour without a guarantee: the error entry being the retry's `from`, the URL Firefox commits its error page at, the order of the events, and Playwright's error texts for aborted requests (downloads and interrupted navigations must not count as failures). A change in any of them could make the registry misread a real arrival. Worth doing if retried navigations turn out to be common; it needs a probe of each of those facts on the then-current Playwright first.
