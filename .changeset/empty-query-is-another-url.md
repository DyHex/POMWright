---
"pomwright": patch
---

`expectThisPage()` and `expectAnotherPage()` treat a URL with an empty query or fragment (`/orders?`, `/orders#`) as a
different URL from `/orders`, as Playwright's `toHaveURL` and `waitForURL` do and as the docs said ("a page's identity
is its exact URL").

The matcher compared the path against `pathname + search + hash`, where the URL API reports an empty query or fragment
as `""`, so `expectThisPage()` passed on `/orders?` while `expect(page).toHaveURL(ordersPage.fullUrl)` failed. A RegExp
path is now tested against the same rest of the URL, the empty `?` or `#` included.

If a page of yours may land with an empty query or fragment, give it a RegExp path that allows one, for example
`/^\/orders\??$/`.
