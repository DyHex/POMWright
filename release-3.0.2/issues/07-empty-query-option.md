**Title:** An option to treat an empty `?` or `#` as the same page

**Labels:** backlog

---

From 3.0.2, `expectThisPage()` and `expectAnotherPage()` compare URLs as Playwright's `toHaveURL` does: `/orders?` and `/orders#` are different URLs from `/orders`.

A page-object option could treat an empty query or fragment as absent: from a page object's point of view, an empty query carries nothing, so it is the same page. The option would be per page object (for example in `navOptions`), not per call, so that `expectThisPage` and `expectAnotherPage` stay exact opposites.

A RegExp path covers this today (`/^\/orders\??$/`). A new option is a minor; worth adding if someone asks for it.
