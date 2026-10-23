---
"pomwright": patch
---

From JavaScript, `navigation.goto()` with a `URL` object, or any first argument that is neither a URL string nor
options, throws as Playwright's `page.goto()` does:

```text
LoginPage: goto() takes a URL string or options; received a URL object; pass its href.
```

Before, it took the `URL` object for the options of the this-page form and navigated to the page object's own URL,
running its actions after navigation. TypeScript already rejected the call.
