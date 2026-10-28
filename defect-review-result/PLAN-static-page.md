# Plan 44: the static test page loads nothing from outside the test server

- **Decisions**: to be recorded as decision 78 once this plan is agreed
- **Findings**: CI run 40671631885, job 122759804310 (`Harness (chromium, Playwright pin, Node 20)`, attempt 1, at
  `28c7c5b`): two tests flaky, so the job failed (`failOnFlakyTests`); a re-run passed
- **Bump**: none (test infrastructure; nothing published changes)
- **Stop**: **yes**, after the commit: it adds a CI job (the maintainer pushes; the PR run validates it)
- **Depends on**: plan 43; runs before plan 42, whose Node 22 row loads the same page

## What happened

Both tests timed out in `page.goto` to the static page (`http://localhost:9000/` and `/?tab=1`) after the 10-second
`navigationTimeout`, waiting for `load`; both passed on their retry, in 2.3 and 0.9 seconds. The error context at each
timeout shows the page parsed and rendered ("My Profile", "Designer, UI"), so the test server had answered and `load`
was waiting for subresources. The page loads six from four hosts outside the test server: `www.w3schools.com`
(`w3.css`, `w3-theme-blue-grey.css`), `cdnjs.cloudflare.com` (Font Awesome 4.7's CSS and font), `fonts.googleapis.com`
and `fonts.gstatic.com` (Open Sans). In the retries' traces they took 35 ms to 1.7 s; one that stalls past 10 s fails
the `goto`. The two first attempts started 17 s apart, as one slow host would. Five spec files open the page, on every
browser and in every harness job. No other route of `server.js` loads anything from outside it (checked: no `http(s)`
URL in its pages but its own hosts).

## Contract

The harness serves no page that needs the internet. The static page (`test/test-data/staticPage/`) keeps the
structure, roles, accessible names and texts the tests use, and its look at the viewport the harness uses (1280 × 720,
the same responsive rules), with nothing of the template's:

- **Styles**: one local stylesheet holding only the rules the page uses, taken from the current `w3.css` and its
  blue-grey theme (W3Schools publishes W3.CSS as free to use, no license needed), every class renamed without the `w3-`
  prefix (`w3-top` → `top`, `w3-dropdown-hover` → `dropdown-hover`, `w3-theme-d2` → `theme-d2`, …); the inline
  script's class names follow.
- **Font**: the system sans-serif stack instead of Open Sans.
- **Icons**: Font Awesome's `<i class="fa fa-…">` replaced by small inline SVG glyphs of our own, `aria-hidden="true"`,
  so no accessible name changes.
- **Images**: `w3images/` (nine template photos, 8.6 MB) replaced by `images/`, small SVG placeholders made for the
  page, with the same `alt` texts.
- **Text**: a neutral title instead of "W3.CSS Template", a neutral interest tag instead of "W3Schools", the footer's
  "Powered by w3.css" link removed, the template's comments kept only where they name a section.
- **Checked, for every page the server serves** (the maintainer's request, 2026-10-28): `server.js` lists its routes
  at a test-only `GET /__routes`, read from Express's router (`app.router.stack`, Express 5.3.0), so a route added later
  is covered without editing the test. A spec, `test/test-server/externalRequests.spec.ts`, runs one test per `GET` route and
  for `/` (the static folder, not in the router's list): it records every request of the browser context (frames and
  popups included) from the `goto` until the network is idle, and allows only the test server's two origins
  (`http://localhost:9000`, `http://127.0.0.1:9000`) and `data:`, `about:` and `blob:` URLs. A route with a parameter
  (`/testpath/:color`, `/testnav/item/:id`) takes a sample from a table in the spec, and the spec fails for one without
  a sample. Routes that are not documents (`/teststorage/download`, `/204`, `/api`, the two service-worker scripts) are
  requested the same way and checked without expecting a page. A second test scans `server.js` and every file under
  `test-data/` for an `http(s)` URL to another host, which covers the four `POST` routes and anything loaded only on a
  click or a timer.
- **A check of its own** (the maintainer, 2026-10-28): what a page requests depends on no browser, Playwright version or
  Node line, and a failure must not read as a harness failure. The spec has its own folder and Playwright config
  (`test/test-server/`, `test/playwright.test-server.config.ts`: chromium only, the test server as its `webServer`), so
  no harness job runs it; `test-server-check.sh` at the root runs it (the extracted tarball, `test/`'s frozen install,
  chromium, the config); `pack-test.sh` calls it at its end outside CI, so `pnpm pack-test` stays the complete local
  run. CI runs it in a job of its own in `checks.yaml`, "Test server: no external requests", after `package` (it
  downloads the tarball `test/`'s install needs), on every pull request and push to `main`; the gate `build` requires
  the whole `checks` workflow, so it is required without a change to branch protection.
- **The browser's own traffic is not counted.** The spec listens to the browser context's `request` event, which reports
  what the context's pages, frames and workers request; the browser's background traffic is not part of it, and
  Playwright 1.64.0 starts Chromium with that traffic switched off (`--disable-background-networking`,
  `--disable-component-update`, `--disable-sync`, `--metrics-recording-only`, `--disable-client-side-phishing-detection`,
  `--disable-field-trial-config`, read from `playwright-core`'s source). The first run prints every URL it sees, to
  confirm it; if a browser-internal request ever showed up, the allowance would be by scheme (`chrome:`,
  `chrome-extension:`), never by host.

## Steps

1. Fetch today's `w3.css`, `w3-theme-blue-grey.css` and Font Awesome 4.7's CSS into the scratchpad (the CSS for the
   icon list only); list the classes `index.html` and its script use; write `staticPage/site.css` with those rules,
   renamed, the media queries kept.
2. `index.html`: the stylesheet and font links replaced by `site.css`; classes renamed; icons as inline SVG; images from
   `images/`; title, tag and footer as above; the inline script's class names.
3. `w3images/` removed; `images/` with the placeholders (four avatars, five photos, each a few hundred bytes).
4. Tests: `testPage.locatorSchema.ts`'s five selectors; the rendered chains in `testApp/testPage.spec.ts`,
   `locatorRegistry/getLocator/getLocator.spec.ts` and `locatorRegistry/getNestedLocator/getNestedLocator.spec.ts`
   (those two compare chains only and never open the page; renamed so no `w3-` name is left).
5. `server.js`: `GET /__routes`, every route's method and path from `app.router.stack` (checked by a probe first: the
   stack's shape in Express 5.3.0). `test/test-server/externalRequests.spec.ts`, `test/playwright.test-server.config.ts`,
   `test-server-check.sh`, `pack-test.sh`'s call outside CI, and the job in `.github/workflows/checks.yaml` (pinned
   actions as the other jobs, its header comment), as the contract says; `test/tsconfig.json` covers the new folder if
   its `include` does not already.
6. `test/AGENTS.md`: "serves `test-data/staticPage` (a W3 template page)" becomes a description of the page as it is;
   the server's route list names `/__routes`; a fixture page loads nothing from outside the test server, which
   `test-server/externalRequests.spec.ts` checks for every route, and a new route with a parameter needs a sample there;
   `test-server-check.sh` and its place in `pack-test`. `.github/AGENTS.md`: the new job. The root AGENTS.md's
   `pack-test` line, if it names what the run includes.
7. Screenshots of the page before and after at 1280 × 720 into the scratchpad, compared by eye; the maintainer gets
   both.

## Verify

`git grep -i -E "w3|w3schools|googleapis|gstatic|cdnjs|font-awesome"` over `test/` finds nothing; actionlint 1.7.12 with
ShellCheck 0.11.0 (the pinned versions); `bash test-server-check.sh` on its own; `pnpm lint`;
`pnpm test:unit`; `pnpm pack-test --reporter=line` on the three browsers; the five static-page spec files 20 times on
chromium (`--repeat-each=20`); `externalRequests.spec.ts` fails, naming the route and the URL, when one external link
is put back in the static page and when one is put in a `server.js` page (probes, then reverted), and fails for a
parametric route added without a sample (a probe route, then removed).

## Commit

```text
test: the static test page loads nothing from outside the test server

Its stylesheets, font, icons and images came from W3Schools, cdnjs and
Google Fonts, and a slow response from any of them could stall the page's
load event past the navigation timeout, which made two tests flaky in CI.
The page keeps its structure, roles and texts with a local stylesheet,
inline icons and placeholder images, and a check of its own, a CI job
the gate requires, fails if any page the test server serves requests anything from
another host.

Plan: defect-review-result/PLAN-static-page.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

2026-10-28.

- **The stylesheets**: W3Schools answers a plain download with 403, and the `w3-css` package on npm (4.1.0) has `w3.css`
  but no themes, and the CI traces keep no bodies from other hosts; so the stylesheets came from the browser's own load
  of the page, as the tests made it (`shoot.cjs` in the scratchpad: chromium from the root package, the page at
  1280 × 720, the bodies saved from its responses), which also took the "before" screenshots and accessibility snapshot.
- **The page** (`build_static_page.py` in the scratchpad, from the page at `HEAD`): `site.css` keeps 127 rules (115
  from `w3.css`, 12 from the theme; 7.7 KB) whose selectors use only the page's classes or none, renamed without
  `w3-`; `@keyframes` dropped, since nothing animates (a first build kept them malformed, which made the browser drop
  the rules after them; fixed in the parser); 16 icons as `<symbol>`s of an inline sprite, used as `<svg
  class="icon …" aria-hidden="true">`; the nine images were uncompressed bitmaps named `.png` and `.jpg` (8.6 MB),
  now SVG placeholders of the same proportions (4.2 KB); title "Static test page", tag "Testing", heading "Social
  media test page", footer "A static page served by the test server"; the script toggles classes with `classList`.
- **Compared**: the screenshots match in layout, colors and size (1280 × 2021 both); the font, the icons' drawing and
  the photos differ, and the interest tags wrap one word earlier. The hover dropdown shows its three items. The
  accessibility snapshot differs in the three changed texts and in names: Font Awesome's glyphs, private-use
  characters, had been part of accessible names (`link " Logo"`, `button " 3"`, and the News, Account Settings and
  Messages links named by the glyph alone); with hidden SVG icons the names are the text or the title (`"Logo"`,
  `"News"`, `"3"`). The tests are unaffected: `name: /Logo/`, `getByTitle(…)` and `getByRole("button")`.
- **Tests**: the five selectors and the rendered chains renamed (`testPage.locatorSchema.ts`, `testPage.spec.ts`,
  `getLocator.spec.ts`, `getNestedLocator.spec.ts`); nothing of the template is left under `test/` (only the W3C's SVG
  namespace, `http://www.w3.org/2000/svg`, which every SVG file declares, and which the scan treats as a name).
- **`/__routes`**: Express 5.3.0 keeps the routes in `app.router.stack` (`app._router` is gone), each route layer with
  `route.path` and `route.methods`, which Express's types leave out (a JSDoc cast in `server.js`, which `tsc -p test`
  checks). 28 routes, 24 `GET`.
- **The check**: one test with a step per page rather than one test per route, since the routes are known only once
  the server answers, and soft assertions report every page; a second test scans the source. First run: 25 pages in
  14.6 s, 43 requests, all to `http://localhost:9000` (42) and `http://127.0.0.1:9000` (1), nothing from the browser
  itself; the static page makes 11 (the document, `site.css`, nine images). Screenshots, video and trace off for this
  config (a failure screenshotted every page it opened). Run in a clean state as the CI job runs it (no `node_modules` at
  the root or in `test/`, `CI=true`, `POMWRIGHT_TARBALL` set): exit 0, so the job needs no root install.
- **Breakages, then reverted**: an external stylesheet in the static page, an external image on `/testids` and a route
  `/zz-probe/:id` without a sample, together: exit 1, with "/ loads only from the test server" (the cdnjs URL),
  "/testids loads only from the test server" (`https://example.com/zz-probe.png`), "a sample for /zz-probe/:id in
  SAMPLES", and the scan naming `server.js` and `test-data/staticPage/index.html` with each URL.
- actionlint 1.7.12 with ShellCheck 0.11.0: 0. `tsc --noEmit -p test`: 0 (after the cast). `pnpm lint`: 0 (after
  `biome check --write` formatted the spec and two locator specs).
- Checks: `pnpm lint` 0; `pnpm pack-test --reporter=line` exit 0 (1,746 passed, 3 skipped; doc snippets 226; api coverage
  0 problems; error messages 0 problems; step locations 31; then the test-server check, 2 passed); the five spec files
  that open the static page (`testPage`, `testNav`, `getLocatorSchema`, `verify`, `step`) 20 times on chromium: 960
  passed. Screenshots before and after in the scratchpad, for the maintainer.
- **Stop**: the commit adds a CI job; the maintainer pushes, and the PR run shows "Test server: no external requests".
