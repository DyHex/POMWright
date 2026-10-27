# H-6: The site, the README and the package description use British spellings ("Organising a project", "behaviour", "labelled", …) where AGENTS.md §9 requires American spelling

- **Kind**: documentation
- **Area**: the documentation as a whole (inventory §8), README, `package.json#description`
- **Severity**: Low (style only; one of the words is a page title and its URL)
- **Semver of the fix**: none (docs only; `package.json#description` is metadata, not API)
- **Reviewed**: `54cdada`, 2026-10-23, H reviewer
- **Status**: decided (2026-10-27, [DECISIONS.md #52](../DECISIONS.md))

## Contract

AGENTS.md §9, page shapes: "Plain sentences, one idea each, no marketing, no "simply" or "just", American spelling."

## Reproduction

From the worktree root:

```sh
grep -rnoiE "\b(organising|organise[sd]?|labelled|labelling|behaviour[s]?|synthesised|serialises|recognise[sd]?|honours?)\b" \
  website/src/content/docs website/snippets README.md website/sidebar.mjs package.json \
  --include=*.md --include=*.mdx --include=*.mjs --include=*.ts --include=*.json | sort -u
```

```text
package.json:4:organises
README.md:146:organising
website/sidebar.mjs:15:organising
website/src/content/docs/api/class-pageobject.md:184:labelled
website/src/content/docs/api/errors.md:252:labelled
website/src/content/docs/docs/locator-modules.md:143:organising
website/src/content/docs/docs/logging.md:137:honours
website/src/content/docs/docs/organising-a-project.md:201:organising
website/src/content/docs/docs/organising-a-project.md:2:Organising
website/src/content/docs/docs/page-objects-in-tests.md:126:organising
website/src/content/docs/docs/page-objects-in-tests.md:126:Organising
website/src/content/docs/docs/principles.md:60:organising
website/src/content/docs/docs/principles.md:60:Organising
website/src/content/docs/docs/principles.md:6:behaviour
website/src/content/docs/docs/resolving-locators.md:88:recognise
website/src/content/docs/docs/session-storage.md:128:labelled
website/src/content/docs/docs/verifying-registries.md:89:organising
website/src/content/docs/internal/page-object-lifecycle.md:52:labelled
website/src/content/docs/internal/seed-registry.md:184:synthesised
website/src/content/docs/internal/seed-registry.md:46:serialises
website/src/content/docs/internal/seed-registry.md:71:behaviour
```

(The list of words was found by a wider search over every word ending in `-ise`, `-ising`, `-isation`, `-our`,
`-lled`; the rest of its hits were American or not spelling variants. README's "Cancelled" is the example app's status
text and is left out.)

## Observed / expected

Observed: 21 British spellings across 15 files, among them the title and URL of a Getting started page,
`/POMWright/docs/organising-a-project/`, linked from four other pages and the sidebar (the README links *Getting started* and names the page in its link text).

Expected: American spellings: organizing, organizes, behavior, labeled, honors, recognize, synthesized, serializes.

## Cause

Written in British English and not caught: Markdown is not linted (AGENTS.md §7, decided), and nothing checks
spelling.

## Fix plan

- **Intended contract**: unchanged.
- **Options**:
  - (recommended) Change the words; rename the page's title to *Organizing a project* and keep its file and URL
    (`organising-a-project`), so existing links keep working. The sidebar label comes from the title.
  - Also rename the file to `organizing-a-project.md`: the URL changes, every internal link with it (the build's link
    check finds them), and links from outside break, since GitHub Pages has no redirects. Not recommended.
  - Relax §9 to accept either spelling. Not recommended; the rule is decided.
- **Implementation steps**: the files above; `package.json#description` ("organizes").
- **Tests**: `pnpm docs:build` (link check) if a slug changes.
- **Docs**: as above.
- **Changeset**: none.
- **Decisions to tick**:
  - [x] American spelling in the 15 files, and in text this branch writes
  - [x] keep the slug `organising-a-project`: **no; renamed to `organizing-a-project`, without a redirect** ([DECISIONS.md #52](../DECISIONS.md))
- **Execution order**: independent; touches pages other scopes may also edit, so apply last.
