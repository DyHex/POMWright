---
"pomwright": patch
---

A URL whose scheme has no origin in the URL standard, such as `chrome-extension://abcdef/`, `app://foo/` or
`file://host/`, is rejected as a page object's `baseUrl` and as `SessionStorage`'s `origin`, with the origin message
and the reason (`…; received "chrome-extension://abcdef/", whose scheme has no URL origin`). Before, `SessionStorage`
accepted it as the origin `"null"`, so its origin check never matched and a seed for it never applied, and a page
object failed with a message about its `urlPath`.
