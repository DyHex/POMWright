# What mapping may and may not do

Mapping opens a real site in a real browser. It reads, and it clicks only to reveal what a user can see; it never
sends data. These rules hold for every route: the shipped `scripts/map.mjs`, `playwright-cli`, or Playwright MCP.

- **Only the origins the user named.** Ask for them before the first navigation; a link to another origin is listed,
  never opened. Several origins (an app and its identity provider) are each named by the user. `map.mjs` opens pages
  only on the start URL's origin and each `--origin` the user named, checked in the browser before each request is
  sent, a redirect's included: a page, a redirect or a click that leads elsewhere is listed as not opened, with its
  origin. With `playwright-cli` or MCP, read where a link leads before clicking it, and stop when a page lands on an
  origin not named.
- **Nothing that sends data.** Every request but `GET` and `HEAD` is aborted while mapping, so a click that would
  submit, buy, add, delete or send reaches nothing (third-party tracking is aborted with it). `map.mjs` does this in
  every command and lists what it aborted. With `playwright-cli` or MCP, set the same up before the first click, with
  the code each can run against the page (`playwright-cli run-code`, MCP's `browser_run_code_unsafe`):
  `page.route("**/*", (route) => ["GET", "HEAD"].includes(route.request().method()) ? route.continue() : route.abort())`;
  where it cannot be set up, do not click.
- **Click only to reveal, and only what the user confirmed.** A menu, a tab, an accordion, "show more", a choice that
  leads to another page (followed, then undone with back), and the cookie dialog with the least-consent button the user
  picks. Never type into a field, submit a form, or click a control whose name says it changes something (buy, add to
  cart, delete, log out, send), even with requests aborted: list it as not mapped and say why.
- **Report what blocks a click.** When another element intercepts a click, report the element; never force a click
  (`force: true`) or dispatch events to get past it. It is a fact about the page a test will meet too.
- **Credentials come from the user, never from guesses.** A page behind a login is mapped with a Playwright
  `storageState` file the user saved, or after the user logs in themselves in a headed browser. A secret is never
  written into a generated file: the generated tests read it from the environment.
- **Prefer a test environment.** Before mapping an origin that looks like production, say so and ask; even `GET`
  requests can trigger tracking, emails or rate limits.
- **Respect the site's limits.** Keep `--depth` and `--limit` small (the defaults are 2 and 40), map the pages the user
  picked rather than everything, and stop when the site answers with errors or rate limiting.
- **Nothing leaves the project.** Snapshots, DOMs and screenshots stay in the temporary folder `map.mjs` writes (or one
  the user agrees to), not in the repository, unless the user asks to keep them.
