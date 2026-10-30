---
"pomwright": patch
---

`seed` no longer fails when the page replaces its document more than once during its first seed's Navigation API
check, as an app that redirects itself by script on load does (`/` to `/login` to `/login/start`). Before, such a seed
failed with Playwright's `Execution context was destroyed`. The check is now repeated while the page replaces its
document, up to 20 times (the default of Playwright's `maxRedirects`), each after the pause Playwright makes before a
retry of its own actions (20 ms, rising to 500 ms); past that, Playwright's error goes through with the helper's
label.
