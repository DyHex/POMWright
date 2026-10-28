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
  show it in the same change. `test/tests/docs/docsChains.spec.ts` keeps the chains so: it rebuilds every chain a page
  or the README shows in a `text` block, a code comment or the running text through the packed package, one test per page, and compares
  it, so a chain that changes fails the harness until the page changes with it.
- **Examples compile.** `scripts/check-doc-snippets.mjs` takes every `ts` block, one small project per page, and
  compiles it against the installed package with the harness's options and `declaration: true`. A block with
  `title="name.ts"` is that file, which the page's other blocks import; lines up to `// ---cut---` are compiled but not
  shown; a `nocheck` block is skipped and listed, and only the 2.x code on *Upgrading from 2.x* may be one; a
  deliberate error is shown with `// @ts-expect-error`, which the check enforces. The example app in
  `website/snippets/`, four page objects on `shop.example` and their fixtures, can be imported from every page. The
  README's examples are compiled as one more page, their blocks titled in the fence (`title="orders.page.ts"`), which
  GitHub and npm do not show.
- **Nothing is skipped silently.** A TypeScript block the check would not compile fails it, with the fix in the
  message: one in a `~~~` fence (write it as a ` ```ts ` block), one labelled `tsx`, `mts` or `cts` (write it as
  `ts`), and `nocheck` on any other page (make the example compile, with `// ---cut---` for the setup lines and
  `// @ts-expect-error` for a deliberate error). Blocks in other languages, `js`, `sh` or `text`, are not checked.
- **The API is complete.** `scripts/check-api-coverage.mjs` reads the installed declarations and fails on an export
  without a page or section, a member without a heading in its own section, a doc comment without a summary or a
  `@param`, a method or class property without a `@see` to its own heading, a link to the site whose page or heading
  does not exist, and an exported type missing from *TypeScript*'s type table. So an editor's hover always links the
  member's own API entry, which links the Docs section.
- **Every message is listed.** `scripts/check-error-messages.mjs` compares *Error messages* with the code both ways:
  a message the source throws, or a compile-error message its types define, that the page does not show fails it, and
  so does a line on the page that no message ends as. Errors no user can reach are listed in the script with their
  reasons.
- **Links resolve.** Links within the site are root-absolute with the base, `/POMWright/docs/<page>/`, and the site
  build fails on a link or an anchor that does not exist.

CI's site job runs all three checks and builds the site on every change that touches code or the pages, and the
harness's type check runs the first two as well.

## Building and publishing

`website/` is a pnpm project of its own, so Astro and Starlight stay out of the library's dependencies. Scripts of the
root `package.json` install it and run it: `pnpm docs:dev` serves the pages at
`http://localhost:4391/POMWright/` and reloads on every edit, but does not check links; `pnpm docs:build` writes
`website/dist` and checks every link; `pnpm docs:preview` builds and serves that build at
`http://localhost:4392/POMWright/`, as it will be deployed. The site's configuration is
`website/astro.config.mjs`; the three sections and their sidebars are `website/sidebar.mjs`, shown as tabs beside the
title by a component of its own; an Expressive Code plugin hides an example's compile-only prelude; Mermaid diagrams
render in the browser, so the build does not catch a syntax error in one. `scripts/check-diagrams.mjs` does: it serves
the built site, opens every page with a diagram in Chromium, in the light and the dark scheme, and fails on a diagram
without an SVG, Mermaid's error diagram, or an error the page logs. `pnpm docs:diagrams` builds the site and runs it; the
`site` job of CI runs it after the build. How a diagram looks is still checked by eye.

`.github/workflows/pages.yaml` builds the site the same way and deploys it to GitHub Pages, after `CI` succeeds on a
push to `main`, from the commit that run tested, so the site follows `main` and never shows a commit whose checks
failed. `CI` runs one push to `main` at a time, in order, so the deployments come in the order of the commits too; a
re-run of an older `CI` run keeps its commit, so Pages deploys only `main`'s tip and skips a commit `main` has moved
past, whose changes the newer commit's site already holds. It is guarded as the publish workflow is, and can also be
started by hand.

## How pages are written

The rules are in [AGENTS.md](https://github.com/DyHex/POMWright/blob/main/AGENTS.md), section 9. In short: pages
follow playwright.dev's shapes; a concept page starts from the Playwright concept beneath it and says what POMWright
adds; page objects reach tests as Playwright fixtures; examples use `*.example` hosts and descriptive paths; plain
sentences, one idea each.
