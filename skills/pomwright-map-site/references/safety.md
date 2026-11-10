# What mapping may and may not do

Mapping opens a real site in a real browser. It reads; it does not act. These rules hold for every route: the
shipped `scripts/map.mjs`, `playwright-cli`, or Playwright MCP.

- **Only the origins the user named.** Ask for them before the first navigation; a link to another origin is listed,
  never opened. Several origins (an app and its identity provider) are each named by the user.
- **Only navigation.** Open the start page and the same-origin links found on it, with GET requests. Never click a
  button, type into a field, submit a form, accept a dialog or follow a link whose path says it changes something
  (`/logout`, `/delete`, `/unsubscribe`): list it as not mapped and say why.
- **Credentials come from the user, never from guesses.** A page behind a login is mapped with a Playwright
  `storageState` file the user saved, or after the user logs in themselves in a headed browser. A secret is never
  written into a generated file: the generated tests read it from the environment.
- **Prefer a test environment.** Before mapping an origin that looks like production, say so and ask; even GET
  requests can trigger tracking, emails or rate limits.
- **Respect the site's limits.** Keep `--depth` and `--limit` small (the defaults are 2 and 40), map the pages the user
  picked rather than everything, and stop when the site answers with errors or rate limiting.
- **Nothing leaves the project.** Snapshots and crawl output stay in the session or a scratch folder the user agrees
  to, not in the repository, unless the user asks to keep them.
