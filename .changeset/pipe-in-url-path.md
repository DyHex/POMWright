---
"pomwright": patch
---

On Chromium, a page object whose string `urlPath` contains `|` matches its page. Chromium reports a `|` in the path as
`%7C`, where Firefox, WebKit and `new URL` keep it, so `expectThisPage()` timed out on the page and `expectAnotherPage()`
passed while the browser was still on it. A string path now compares the two forms as one; a RegExp path sees the URL
as the browser reports it, as before.
