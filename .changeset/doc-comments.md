---
"pomwright": patch
---

### Documentation

- Every export and every public member now has a doc comment, so the editor's hover is a reference, as Playwright's
  own is: a summary, each parameter (with the options of `PageObject`'s constructor and of `SessionStorage` one by
  one), the return value, the errors thrown with their messages, an example, and a link to its page in the API reference. `navigation.goto`,
  `expectThisPage` and `expectAnotherPage` are documented on the type a page object's `navigation` has, and `filter`,
  `nth` and `describe` after a locator method on the type a registration chain has, so the hover shows them where
  you write them.
