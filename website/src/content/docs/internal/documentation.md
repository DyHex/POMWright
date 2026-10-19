---
title: Documentation
description: "Where the documentation lives, how its examples, API coverage and links are checked, and the rules it is written by."
---

## Where it lives

The documentation is this site, built with [Starlight](https://starlight.astro.build/) from `website/`, in three
sections: Docs to learn, the API reference to look up, and these Internal pages to understand. The pages are Markdown in
`website/src/content/docs/`, one folder per section. The editor's hovers are the doc comments in `src/`, written from
the same facts as the API pages.

## What keeps it true

- **The code decides.** Every chain, description and message a page shows is read back from the build by a probe when
  it is written, never written from memory. A change to a message, a rendering or a mechanism updates the pages that
  show it in the same change.
- **Examples compile.** `scripts/check-doc-snippets.mjs` takes every `ts` block, one small project per page, and
  compiles it against the installed package with the harness's options and `declaration: true`. A block with
  `title="name.ts"` is that file, which the page's other blocks import; lines up to `// ---cut---` are compiled but not
  shown; a `nocheck` block is skipped and listed (only the 2.x code on *Upgrading from 2.x*); a deliberate error is
  shown with `// @ts-expect-error`, which the check enforces. The example app in `website/snippets/`, a login page
  object and its fixtures on `shop.example`, can be imported from every page.
- **The API is complete.** `scripts/check-api-coverage.mjs` reads the installed declarations and fails on an export
  without a page or section, a member without a heading, or a doc comment without a summary or a `@param`.
- **Links resolve.** Links within the site are root-absolute with the base, `/POMWright/docs/<page>/`, and the site
  build fails on a link or an anchor that does not exist.

CI's site job runs all three checks and builds the site on every change that touches code or the pages, and the
harness's type check runs the first two as well.

## Building and publishing

`website/` is a pnpm project of its own, so Astro and Starlight stay out of the library's dependencies. Three scripts
of the root `package.json` install it and run it: `pnpm docs:dev` serves the pages at
`http://localhost:4391/POMWright/` and reloads on every edit, but does not check links; `pnpm docs:build` writes
`website/dist` and checks every link; `pnpm docs:preview` builds and serves that build at
`http://localhost:4392/POMWright/`, as it will be deployed. The site's configuration is
`website/astro.config.mjs`; the three sections and their sidebars are `website/sidebar.mjs`, shown as tabs beside the
title by a component of its own; an Expressive Code plugin hides an example's compile-only prelude; Mermaid diagrams
render in the browser, so the build does not catch a syntax error in one: open the page.

`.github/workflows/pages.yaml` builds the site the same way and deploys it to GitHub Pages, after `CI` succeeds on a
push to `main`, so the site follows `main`.

## How pages are written

The rules are in [AGENTS.md](https://github.com/DyHex/POMWright/blob/main/AGENTS.md), section 9. In short: pages
follow playwright.dev's shapes; a concept page starts from the Playwright concept beneath it and says what POMWright
adds; page objects reach tests as Playwright fixtures; examples use `*.example` hosts and descriptive paths; plain
sentences, one idea each.
