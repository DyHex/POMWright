# Samples for PLAN-5-DOCS.md

The sample pages of [PLAN-5-DOCS.md](../PLAN-5-DOCS.md), section 3, written in full as they would ship, and the
TypeDoc output they are compared with. Temporary, like the rest of `release-3.0.0/`.

| file | what it is |
| --- | --- |
| [docs/first-page-object.md](docs/first-page-object.md) | sample Getting started page |
| [docs/resolving-locators.md](docs/resolving-locators.md) | sample concept page |
| [api/class-pageobject.md](api/class-pageobject.md) | sample API page, hand-written in Playwright's style |
| [api/class-locatorquerybuilder.md](api/class-locatorquerybuilder.md) | the second hand-written API page of the comparison |
| [typedoc/PageObject.md](typedoc/PageObject.md) | what `starlight-typedoc` generated for `PageObject`, unedited |
| [typedoc/LocatorQueryBuilder.md](typedoc/LocatorQueryBuilder.md) | the same for `LocatorQueryBuilder`, unedited |
| [typedoc/LocatorRegistry.md](typedoc/LocatorRegistry.md), [typedoc/AddAccessor.md](typedoc/AddAccessor.md) | the same for two more aliases, unedited |
| [typedoc/LocatorRegistry-add-with-interface-tag.md](typedoc/LocatorRegistry-add-with-interface-tag.md), [typedoc/LocatorUpdateBuilder-getByRole-with-interface-tag.md](typedoc/LocatorUpdateBuilder-getByRole-with-interface-tag.md) | one member each, generated after adding TypeDoc's `@interface` tag to the alias in a scratchpad clone |

Reading the samples:

- They are the site's source files: frontmatter for Starlight, links written as the site needs them
  (`/POMWright/docs/...`), so they do not resolve in an editor preview.
- In a `ts` block, the lines up to `// ---cut---` are compiled by the snippet check but not shown on the site.
- Every `ts` block compiles against the packed package (26 blocks, `declaration: true`), and every chain, description
  and message they print was read back from the 3.0.0 build in chromium (probes S9 and S23 of the plan).
- Revised on 2026-10-16 after the review: the first page creates its page object in the test once and points to
  fixtures; the concept page's `getLocator` section is about chains built by hand.
