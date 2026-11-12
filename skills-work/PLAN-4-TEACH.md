# PLAN-4-TEACH: the `pomwright-teach` skill

Status: **done 2026-11-10 (962214a)**. Written alongside its execution, not before it: under the standing instruction
I designed and built it in one pass and record the design here afterwards. Decisions it applies: S1, S2, S4 (user-invoked:
`disable-model-invocation: true` and `agents/openai.yaml`), C7 (lessons plus runnable exercises against a practice
app), C8.

## Design

- **Method** from Matt Pocock's `teach` ([ecosystem.md](ecosystem.md)): a stateful workspace (mission, resources,
  lessons, reference sheets, learning records, notes, assets), knowledge from high-trust sources only, lessons short
  and tied to the mission, quizzes with equal-length options and varied correct positions, records written only on
  evidence. Two additions where the article named its weak spots: a **review lesson** every few lessons or after a break
  (interleaved retrieval), and **runnable exercises** whose spec is the feedback loop.
- **Sources** for every lesson: the `pomwright` skill (by name, S2), the site, the workspace's installed declarations,
  playwright.dev.
- **The workspace** is a small Playwright project of its own (`npm init -y`, `@playwright/test`, `pomwright`,
  chromium), set up after asking; outside the user's work projects.
- **The practice shop** (`assets/practice-app/`): static pages and `server.mjs` (Node's `http`, no dependency),
  port 4173. Pages: home (header with a named navigation, newsletter form, cookie dialog shown until session storage
  `consent` is set), products (cards with headings including "Lamp" and "Desk lamp", for the exact-name query), cart
  (a table from session storage `cart`, JSON), payment (an iframe of `/payment/card`), login (a form that goes to
  `/account/42`), account (`/account/<id>`). One part per curriculum unit.
- **Curriculum** (13 units, Playwright basics first), **exercises** (solution first, run green, then the TODO version,
  run red with a message that points at what is missing).

## Probes (Playwright 1.64, the packed build)

- The practice shop with POMWright page objects (a base class with RegExp-capable options and a JSON session storage
  schema; six scenarios: cookie dialog, newsletter, a card by its heading's exact name into the cart, a seeded cart and
  a removal with `get("cart")` decoded, paying inside the iframe, a login to a RegExp page): 15 passed on chromium,
  firefox and webkit with parallel workers, then 75 of 75 with `--repeat-each 5`. Files in `probes/teach/`.
- Biome lints the shop's HTML and CSS too: it required `type="button"` on non-submit buttons and a non-empty `<h1>`; my
  first payment page put a `srcdoc` with quotes that the fix broke, so the card form became its own page loaded with
  `src`, a real framed document.
- The example exercise of `references/exercises.md`, in a scratch workspace with the config template unchanged: the
  starter fails with `No locator schema registered for path "main.form@newsletter".` and the solved one passes. My
  first text said the page object's check would report it; the check does not report union paths that are never
  registered (as *Verifying a registry* says), so the text now quotes the resolution error.
- Checks: skills 4 pass (teach passes the user-invoked rule), guide 207 links in 37 files, snippets 282 (55 in skills,
  14 templates), lint 0, skills chains 9 passed, private-name grep none. The site-URL rule caught a URL template I wrote
  (`…/docs/<page>/`), replaced with a real link.

## Left for PLAN-6 (evals)

Whether an agent following the skill sets up the workspace, writes a lesson with a passing exercise, and records
learning as described, measured on Claude models.

## Full run at 841806f (after PLANs 3 to 5)

All exit 0: lint; guide (211 links in 38 files); skills (4 checked); workflows; `pnpm test`: unit 1,014, snippets 282
(55 in skills) and 14 templates, harness 1,919 passed and the 1 browser-conditional skip on three browsers, step
locations 12, test-server 29; `pnpm docs:build` 53 pages.
