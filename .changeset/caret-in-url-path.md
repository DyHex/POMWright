---
"pomwright": patch
---

On Node 20 and 22, a string `urlPath` containing `^` matches the page: `expectThisPage()` finds it, and
`expectAnotherPage()` no longer passes while the browser is still on it. Every browser reports a `^` in the path as
`%5E`, as `new URL` does on Node 24, but Node 20 and 22's `new URL` keeps it, so the two never compared equal there.
A string path now treats `^` and `%5E` in its path part as one, as it already did `|` and `%7C`.
