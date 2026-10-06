# POMWright 3.0.0 release notes

> Working draft, maintained in `release-3.0.0/` while the release is built. It lists only changes that are done or
> committed to by a plan in this folder. It is not a summary of the analysis. Status markers:
> **[planned]** covered by a plan, not yet implemented. **[done]** implemented on the working branch.
> **[roadmap]** decided for 3.0.0 but not yet planned. Where a planned item depends on an open decision, the
> decision number from the plan is given. When 3.0.0 ships, drop the markers and this note; what remains is the basis
> for the changelog entry and the announcement.
>
> Last updated 2026-10-06. Plans covered: 1.1-1.2 (getById). Nothing executed yet.

## Overview

POMWright 3.0.0 is a major release focused on fixing bugs, maintenance, removing dead, redundant, or unnecessary
code, structural improvements, and improving packaging, tooling, CI, quality, reliability, performance, test coverage,
and documentation.

Requirements: unchanged so far. Peer dependency `@playwright/test >=1.57.0 <2.0.0`.

## Breaking changes

### `getById(string)` matches ids verbatim **[planned, plan 1.1-1.2]**

In 2.x, `getById("#login")` and `getById("id=login")` were normalised to `login`, and the resolved selector was
`#<id>` passed through a CSS escape that did not work for most real-world ids. In 3.0.0:

- The string is matched verbatim and case-sensitively against the element's `id` attribute. `getById("#x")` now
  looks for `id="#x"`. No prefixes are recognised.
- The resolved selector is `[id="…"]` with proper CSS string escaping, so ids containing `.`, `:`, `[`, `]`, spaces,
  quotes, backslashes, `>>`, non-ASCII characters, or a leading digit all work.
- `toString()` and error output render `locator('[id="x"]')` instead of `locator('#x')`.
- `getById("")` throws at registration instead of failing at resolution. The message names the registry path, or
  `createReusable.getById` for reusable seeds.

**Migration.** Find stale prefixed call sites with

```sh
grep -rnE 'getById\(\s*["'"'"'`](#|id=)' --include=*.ts .
```

and drop the prefix. Tests that compare rendered locator strings need `#x` changed to `[id="x"]`.

### `getById(RegExp)` is a real pattern match **[planned, plan 1.1-1.2]**

In 2.x a RegExp id was flattened to `[id*="<source>"]`: the regex source text was used as a literal substring match
on the id. Plain patterns such as `/btn-submit/` worked by coincidence, `/a.b/` matched only the literal text `a.b`,
anchored patterns matched nothing, and flags were ignored. In 3.0.0 the regex is evaluated against each element's
`id` with its flags. An unanchored pattern is still a substring match; anchor with `^` and `$` to match a whole id.

- All flags pass through to Playwright unchanged, as with Playwright's own locators. The sticky `y` flag acts as a
  start anchor on Playwright 1.64 and later, and is unreliable on earlier versions because of a Playwright bug fixed
  in 1.64.0 (microsoft/playwright#42818). Prefer `^`.
- The rendered selector changes from `[id*="…"]` to `internal:attr=[id=/…/flags]`, the same engine Playwright's own
  `getByTestId(RegExp)` compiles to.

## Bug fixes

- `getById(string)` no longer breaks on ids with punctuation, whitespace, quotes, or a leading digit (analysis 1.1).
  **[planned]**
- `getById(RegExp)` no longer silently matches nothing for patterns with metacharacters (analysis 1.2). **[planned]**
- Resolving an id definition that lacks an id now throws a descriptive error instead of falling back to an empty
  id. **[planned]**

## Removed and internal cleanup

- The internal helpers `cssEscape` and `normalizeIdValue` are removed from `src/locators/utils.ts`. Neither was
  exported from the package entry point. **[planned]**
- The id-specific normalisation repeated across `add`, `update`, `replace`, and resolution is gone with them
  (analysis 1.10, third bullet). **[planned]**

## Tooling, CI, and tests

- A unit-test layer for the pure helpers, with `pnpm test:unit` and `pnpm test` running unit tests before the
  packed integration suite. CI runs the unit tests after lint. The runner is vitest, with tests colocated as
  `src/**/*.test.ts`; they never enter the bundle or the published tarball. **[planned]**
- A new `/testids` fixture route in the test server, a `testIds` page object and fixture, and a spec that covers
  tricky ids, verbatim matching, case sensitivity, shadow DOM, frames, and RegExp matching against real DOM.
  **[planned]**
- Existing `getById` specs extended for registration-time validation, flag preservation, seeded inheritance, and
  the new rendered selectors. **[planned]**

## Documentation

- `docs/v3` created as the working documentation set for 3.0.0. `docs/v2` is frozen as the 2.x reference.
  **[planned]**
- The `getById` section of `docs/v3/locator-registry.md` rewritten: string and RegExp semantics, validation,
  multiple matches, what the resolved selector looks like, and a 2.x to 3.0 migration subsection. **[planned]**
- `AGENTS.md` rewritten as the persistent contributor guide, including the 3.0.0 workflow. Removes the incorrect
  "thenable query builders" wording (analysis section 5, AGENTS.md). **[done]**
- A new documentation site built with Starlight and hosted on GitHub Pages, using `docs/v3` as its source.
  **[roadmap]**

## Upgrade checklist (2.x to 3.0.0)

Grows as plans land.

1. Run the grep above and remove `#` and `id=` prefixes from `getById` calls.
2. Update any assertions on rendered locator strings for id-based locators.
3. Plain unanchored `getById(/pattern/)` calls keep working unchanged, because an unanchored regex is a substring
   match. Review patterns that contain regex metacharacters (`.`, `[`, `]`, `(`, `)`, `+`, `*`, `?`, `^`, `$`,
   `|`) or flags: 2.x matched them as literal text, 3.0.0 interprets them. Escape characters meant literally
   (`/a\.b/`) and expect flags such as `i` to take effect.
