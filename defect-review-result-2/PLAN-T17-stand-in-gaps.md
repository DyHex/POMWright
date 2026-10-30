# Plan: the claims only a stand-in backs, checked for real

- **Decision**: [125](DECISIONS.md), agreed 2026-10-30 with every recommendation (the maintainer's request after the
  report of [PLAN-2I-contributor-guide.md](PLAN-2I-contributor-guide.md): build the gaps of its execution note 3 now,
  not in the backlog)
- **Findings**: none; the gaps were found while step 7 of PLAN-2I disclosed every stand-in (decision 113). One
  correction came out of the probes: the reason the docs give for `toHaveURL` and credentials (part 5)
- **Bump**: none (tests, the test server, and the wording of one reason in two pages and one doc comment)
- **Stop**: after the build, a report, then PLAN-bench-performance's phase 1, unless something unexpected came up
- **Depends on**: [PLAN-2I-contributor-guide.md](PLAN-2I-contributor-guide.md) (done)

## Contract

No change to the package's behavior. The harness checks five claims for real that only a stand-in checks today:

1. `getByText`, `getByLabel`, `getByPlaceholder` and `getByAltText` registrations resolve on a page the test server
   serves, through a page object, as Playwright's own locators do there.
2. The navigation methods' `waitUntil` and load-state messages are checked against a page whose image the server answers
   late, and `navigationTimeout` against a page the server answers late.
3. The retry after a failed navigation to a seeded origin is checked after a real refused connection: an origin with
   nothing listening, then the test server's app listening there.
4. `fullUrl` equals the URL every browser reports for each host form, on the test server under the names that reach
   it: upper case, IDN under `*.localhost`, a trailing dot, IPv6, IPv4 shorthands, credentials and a port with leading
   zeros. Only the forms that need port 80 or 443, or TLS, stay on `page.route`, disclosed.
5. The docs name the reason `toHaveURL(fullUrl)` fails for a base with credentials correctly: Playwright compares the
   page's `location.href`, which browsers give without credentials. `document.URL` keeps them. The failure itself is
   unchanged and was already documented correctly.

The gap of note 3 about a browser without the Navigation API stays as it is. Its test exists:
[sessionStorage.spec.ts:1730](../test/tests/testApp/sessionStorage.spec.ts#L1730) deletes the API in an init script,
in all three browsers. No browser Playwright ships lacks the API, so nothing real can replace the stand-in, and the
test's comment says so.

## Current behavior (verified 2026-10-30 at `a22e712`)

### The stand-ins

- **Part 1.** `add.getByText.spec.ts`, `add.getByLabel.spec.ts`, `add.getByPlaceholder.spec.ts` and
  `add.getByAltText.spec.ts` match on documents set with `page.setContent`, and their comments name the gap
  ([add.getByText.spec.ts:4-7](../test/tests/locatorRegistry/add/add.getByText.spec.ts#L4-L7)). No test-server page has
  a `<label>`, an `<input>` or a `placeholder` (`server.js` and `test-data/` searched). The static page has `alt` texts
  (`Avatar`, `Northern Lights`, `Nature`), and no page object uses them. `getByTitle` is the exception: `testPage`
  uses it on the static page
  ([testPage.locatorSchema.ts:21](../test/page-object-models/testApp/pages/testPage.locatorSchema.ts#L21)).
- **Part 2.** Three `testNav.spec.ts` tests use `page.route`:
  - "navOptions.waitUntil decides what goto waits for"
    ([testNav.spec.ts:352-372](../test/tests/testApp/testNav.spec.ts#L352-L372)) serves the item page and holds its image;
  - "expectThisPage and expectAnotherPage name a late load state of the right URL" (`:374-399`) does the same for items 7
    and 8;
  - "goto waits up to navigationTimeout" (`:417-432`) answers after 2 s.

  The item route answers at once and has no image ([server.js:296-310](../test/server.js#L296-L310)).
- **Part 3.** "the retry after a refused connection" aborts the request with
  `route.abort("connectionrefused")` ([sessionStorage.spec.ts:1244-1247](../test/tests/testApp/sessionStorage.spec.ts#L1244-L1247)).
  Both tests of the pair skip Firefox, which "shows an error page for an aborted connection only in some runs"
  (`:1235-1238`). The pair hands its outcome over through a file, since a failing test's worker is replaced
  (`:1212-1222`), and compares a message that names `http://127.0.0.1:9000`. `TestStorageSecond` has a fixed base
  ([teststorage-second.page.ts:8](../test/page-object-models/testApp/pages/teststorage/teststorage-second.page.ts#L8)).
  `server.js` exports the app and listens only when started as a program
  ([server.js:640-648](../test/server.js#L640-L648)); `test-server/externalRequests.spec.ts` imports it.
- **Part 4.** `urlHosts.spec.ts` fulfills every request with `page.route`
  ([urlHosts.spec.ts:82](../test/tests/testApp/urlHosts.spec.ts#L82)) for 23 forms (`:22-77`), on `shop.example`,
  `bücher.example` and the like, and on `localhost`, `[::1]` and IPv4 shorthands on port 9000, with path `/x`.

### Probes

They ran with `@playwright/test` 1.64.0 from `test/node_modules`, as Node scripts outside the runner, one worker, on the
maintainer's machine (32 threads), against the test server started with `node test/server.js` unless noted. The scripts
are in the session's scratchpad (`probe-gaps/`), not in the repository.

- **Host forms on the real server, all three browsers.** Each loaded `/testnav`, and `page.url()` was the form
  `new URL` gives, as the spec expects:
  - `bücher.localhost` and `BÜCHER.localhost` became `xn--bcher-kva.localhost`; `ｓｈｏｐ.localhost` became
    `shop.localhost`; `faß.localhost` became `xn--fa-hia.localhost`; `шоп.localhost` became `xn--n1acz.localhost`;
  - `shop.localhost.` kept its dot;
  - `[0:0:0:0:0:0:0:1]` became `[::1]`, and `[::FFFF:127.0.0.1]` became `[::ffff:7f00:1]`;
  - `127.1`, `0x7f.0.0.1` and `2130706433` became `127.0.0.1`;
  - `LOCALHOST` and `HTTP://` were lower-cased, and `localhost:09000` became `localhost:9000`;
  - the four credential forms on `localhost:9000` kept their credentials in `page.url()`, with `p@ss` written
    `p%40ss`.

  The test server already listens on `::1`: Express's `listen(port)` binds every address.
- **`*.localhost` without the system's resolver.** In a user and mount namespace whose `nsswitch.conf` reads only
  `files`, Node's `dns.lookup("foo.localhost")` failed with `ENOTFOUND`. All three browsers still loaded
  `bücher.localhost`, `шоп.localhost` and `xn--bcher-kva.localhost`. So the browsers resolve `*.localhost`
  themselves, and CI's resolver cannot change the result. The namespace stands in for a runner without that
  resolution, and only `/etc/nsswitch.conf` was swapped in it.
- **Credentials and `toHaveURL`, all three browsers.** This ran against a scratch Node server on `127.0.0.1`: a real
  server, but not the test server. One path answered at once; one asked for Basic auth first. A third case was the same
  URL fulfilled by `page.route`.
  - In all three cases, `page.url()` and `document.URL` kept `user:pass@`. `location.href` dropped it.
  - `toHaveURL` with the credentials failed, and `toHaveURL` without them passed.
  - Browsers sent `Authorization: Basic dXNlcjpwYXNz` only after the 401, which matches the docs' "browsers send them
    when the server asks".
  - Playwright 1.64.0's injected script compares `this.document.location.href` for `to.have.url`
    (`playwright-core/lib/coreBundle.js`).
  - So the stand-in hid nothing here: `page.route` and the real server gave the same results.
- **A real refused connection, all three browsers, 10 rounds each.** The probe navigated from `/testnav` to a port it
  had just closed:
  - Chromium rejected with `net::ERR_CONNECTION_REFUSED` and showed `chrome-error://chromewebdata/` every time;
  - Firefox rejected with `NS_ERROR_CONNECTION_REFUSED`, and `page.url()` was the refused URL a second later every
    time: its error page, 10 of 10, where `route.abort` showed it only in some runs;
  - WebKit rejected with "Could not connect to 127.0.0.1: Connection refused" and stayed on `/testnav` every time.

  The sample is small, with one worker and outside the test's flow, so it does not decide the Firefox skip. Step 3
  does.
- **A late image and a late server, all three browsers.** This ran against a scratch Node server standing in for the
  routes of part 2: one page whose image came 10 s late, one page answered 2 s late. It could hide nothing Express
  adds, since only the timing of the answer matters here.
  - `goto(…, { waitUntil: "commit" })` left `document.readyState` `"interactive"`.
  - `waitUntil: "load"` with a 500 ms timeout rejected with "Timeout 500ms exceeded".
  - A 700 ms `goto` to the late page rejected, and the page arrived after about 2020 ms.

### Where the credentials reason is written

- [urls-and-navigation.md:45-47](../website/src/content/docs/docs/urls-and-navigation.md#L45-L47) ("it compares the
  document's URL, which browsers give without credentials");
- [class-pageobject.md:262-265](../website/src/content/docs/api/class-pageobject.md#L262-L265);
- `fullUrl`'s doc comment, [pageObject.ts:184-186](../src/pageObject.ts#L184-L186);
- [urlHosts.spec.ts:9-11](../test/tests/testApp/urlHosts.spec.ts#L9-L11);
- [test/AGENTS.md:143-145](../test/AGENTS.md#L143-L145).

Decision 69's commit `55e7149` wrote them, from the `page.route` spec.

## Options

- **Part 1.**
  - *A, recommended:* a fixture page of its own, `/testgetby`, with a page object and a DOM-level spec under
    `testApp/`, as `test/AGENTS.md` asks ("New fixture pages go in as new routes, not into the static page").
  - *B:* the elements added to an existing route, such as `/testfilters`. That mixes two fixtures, and a change to one
    breaks the other's spec.
- **Part 2.**
  - *A, recommended:* query flags on the item route, as `/teststorage` has them. `?delay=<ms>` makes the server
    answer that late. `?image=<ms>` adds an image `/testnav/image.svg?delay=<ms>`, which the server answers that late.
    No new route has a parameter, so `externalRequests.spec.ts` needs no sample and opens both pages at once.
  - *B:* new routes with the delay in the path, such as `/testnav/held/:ms`. They need samples, and a fixed delay would
    make the check wait it out.
- **Part 3.**
  - *A, recommended:* the spec runs the test server's app on a port of its own. It takes a free port (listen on 0,
    close), navigates there (refused), then `app.listen(port, "127.0.0.1")` and retries. It is the real app and a real
    refused connection. Another process could take the port between the close and the listen; the test would then
    fail at `listen` with `EADDRINUSE`, never pass falsely.
  - *B:* a small proxy that forwards to port 9000. That is more code and a second hop.
  - *C:* keep `route.abort`.
- **Part 4.**
  - *A, recommended:* the test server under every name that reaches it, with `/testnav` as the page and `/testids` as
    elsewhere. The four forms on `shop.example` that need port 80 or 443, or TLS, stay on `page.route`:
    - http's default port;
    - https's default port;
    - a default port with leading zeros;
    - another port (https, 8443).

    A server there needs root or a certificate, and the browser drops or keeps the port in its URL parser, before any
    request. The new real form `localhost:09000` covers leading zeros on a port the server listens on.
  - *B:* Playwright's `proxy` option with the test server as the proxy. It needs no name resolution and no privileged
    port, so the port forms could go through it too. But it is itself a stand-in for a direct connection, and the
    proxy is code of its own.
  - *C:* leave every form on `page.route`.
- **Part 5:** name `location.href` where the docs now say "the document's URL", and pin it in the spec. No
  alternative: the current wording is wrong for `document.URL`.

## Implementation (one commit per step, then the record)

1. **`getBy*` on a served page.**
   - `server.js`: `/testgetby`, a fixture page with:
     - paragraphs for `getByText`: exact text, a longer text that contains it, and text matched by a RegExp;
     - inputs for `getByLabel`: a wrapping label, a `for` label, `aria-label` and `aria-labelledby`;
     - an input and a textarea with a `placeholder`;
     - two images of the static page's own (`/images/nature.svg`, `/images/lights.svg`) with `alt`.

     Each group is in a `<section>`, so a nested chain has a parent to resolve through.
   - `page-object-models/testApp/pages/testgetby/`: `testgetby.locatorSchema.ts` and `testgetby.page.ts`, a page object
     registering each strategy with a string and a RegExp, `exact`, and a `filter` or `nth`, under its section.
   - `fixtures/testApp.fixtures.ts`: `testGetBy`.
   - `tests/testApp/testGetBy.spec.ts`: each registration resolves on the served page to the element Playwright's own
     locator finds there (same count, same element by its text or value), through `getNestedLocator`.
   - The four `add.getBy*.spec.ts` comments drop "a gap" and name the spec.
   - `test/AGENTS.md`: the route list and the page objects.
2. **A late image and a late server in `testNav`.**
   - `server.js`: the item route takes `?delay=<ms>` and `?image=<ms>`, and `/testnav/image.svg?delay=<ms>` answers an
     SVG that late.
   - `testNav.spec.ts`: the three tests use them, with no `page.route`.
     - The waitUntil test and the late load-state test use items `7?image=10000` and `8?image=10000`. Their messages
       name those URLs.
     - The navigationTimeout test uses `7?delay=2000`.
     - The `held` promises and `release()` go, and the comments say what the server does.
   - `test/AGENTS.md`: the item route's flags.
3. **A real refused connection.**
   - `TestStorageSecond` takes an optional `baseUrl` (default `http://127.0.0.1:9000`).
   - `sessionStorage.spec.ts`: for "a refused connection", the test takes a free port, seeds that origin, navigates
     there (refused), starts `app.listen(port, "127.0.0.1")`, and retries.
     - The server closes in a `finally`.
     - The outcome file carries the origin, so the second test compares the message with it.
     - The comment says what is real.
   - **The Firefox skip** goes if the pair passes 30 rounds per browser with parallel workers
     (`--repeat-each=30 --workers=8`) and under `taskset -c 0-3`. Otherwise it stays, with the reason seen.
   - `test/AGENTS.md`: a spec may also listen with the app on a port of its own.
4. **`urlHosts` on real hosts, and the reason `toHaveURL` fails with credentials.**
   - `urlHosts.spec.ts`: `HostPage` takes the path.
     - The forms of part 4's option A run against the test server, with no `page.route`.
     - The four port forms keep it, under a comment that says why and what it could hide.
     - Each credential form also checks `location.href` (without them) beside `page.url()` (with them).
   - The reason in the five places above becomes "the page's `location.href`, which browsers give without
     credentials" (`document.URL` keeps them), in the pages' and the doc comment's own words.
   - `test/AGENTS.md`: the spec's description.
5. **The record.**
   - The execution notes.
   - PLAN-2I's execution note 3 says where each gap went.

   Decision 125 went into DECISIONS.md with this plan's commit, when it was agreed (rule 3 of `docs/releases.md`).

## Verification

- Each step:
  - its specs on all three browsers (`pnpm pack-test <specs> --reporter=line`);
  - `tsc -p test`, `pnpm lint`;
  - for steps 1 and 2, `test-server-check.sh`, which opens the new pages;
  - for step 4, `pnpm docs:build`, `pnpm typecheck` (the doc comment) and `pnpm lint:guide`.
- Step 2's tests and step 3's pair: `--repeat-each=10` and `--repeat-each=30` respectively, with 8 workers, also under
  `taskset -c 0-3`, since they depend on timing.
- At the end: `pnpm test:unit`, the full `pnpm pack-test --reporter=line` and `pnpm test:constrained --reporter=line`.
- CI: the PR run is chromium only. The only machine-dependent fact, `::1` on the runner, would fail there too, on
  chromium, so it shows before the merge.

## Decisions checklist

1. [x] The gaps are built now, before PLAN-bench-performance. Default: yes.
2. [x] Part 1: `/testgetby`, its page object and `testGetBy.spec.ts`; the four `add.getBy*` comments point to it.
   Default: yes.
3. [x] Part 2: the item route's `delay` and `image` flags and `/testnav/image.svg`; the three tests drop `page.route`.
   Default: yes.
4. [x] Part 3: the app on a port of the spec's own; `TestStorageSecond` takes an optional `baseUrl`; the Firefox skip
   goes only after the rounds above pass. Default: yes.
5. [x] Part 4: every form the test server can answer runs against it; the four port forms on `shop.example` stay on
   `page.route`, disclosed; `localhost:09000` is added. Default: yes.
6. [x] Part 5: the reason names `location.href` in the five places, and the spec pins it. Default: yes.
7. [x] No changeset and no bump. Default: yes, as for `55e7149`, which wrote the same sentences without one.

## Execution

Steps 1 to 4, each verified and committed with the trailer, then step 5 and the full runs. Then the report and
PLAN-bench-performance's phase 1.

## Execution notes

Built 2026-10-30, one commit per step: the plan and decision 125 in `5a76e19`, then `9a3f718` (1), `98f54e1` (2),
`c6e0ff1` (3) and `c71fce8` (4); this record is step 5.

1. **Unexpected, corrected during the build: `route.abort()` is a documented case of its own.** The failure table of
   *Seeding session storage* names "a refused connection, offline, `route.abort()`", and the old test was its only
   coverage. Replacing it with the real refused connection would have left that row untested, so step 3 keeps it as a
   third case, where the abort is a project's own mock that the test checks as such, not a stand-in. Firefox was
   skipped there at first, with the rate measured: without the skip, 30 rounds on 8 workers showed its error page in
   27 and none in 3, where the poll for the error page timed out (see 2). On a real refused connection Firefox showed it in 30 of 30
   (and in every round since), so the refused case runs on all three browsers.
2. **The table row's Firefox claim under `route.abort()`, probed and fixed after the report** (the maintainer's go,
   2026-10-30). A temporary spec, deleted after the run, retried without the poll on Firefox, 60 rounds on 8 workers:
   57 showed the error page (within 0.1 s) and failed naming the reason, as the row said; 3 showed none in 10 s and the
   next arrival received the seed, as on WebKit, which the row did not say. On 4 CPUs (`taskset -c 0-3`): 49 and 11,
   the error page within 0.33 s. So the row now says Firefox, in the runs where it shows no error page after
   `route.abort()`, behaves as WebKit, more of them on a loaded machine. The test no longer skips Firefox there: it
   waits up to 5 s for the error page, and skips only the runs without one, at run time, since the page's failure can
   end the test as the error page arrives, before a later `test.fail()` could mark it. The pair's second test skips
   when the first left no outcome. Firefox's case alone, 60 rounds: 116 passed, 4 skipped; the whole pair, 30 rounds
   on 8 workers: 534 passed, 6 skipped; on 4 CPUs: 514 passed, 26 skipped.
3. **Step 1.** The helper compares element identity (each registry match against Playwright's own, by handle). A
   mismatch made on purpose, a copy of the spec comparing "Welcome" with Playwright's "Goodbye", failed with
   "Expected: true, Received: false", and the copy was deleted. The test-server check opened `/testgetby` (27 to 28
   tests), and `/testnav/image.svg` in step 2 (29).
4. **Step 2.** The three tests, 10 rounds on 8 workers: 90 passed on three browsers, and 90 under `taskset -c 0-3`.
   Without a flag, the item route answers after a `setTimeout` of 0, as good as at once.
5. **Step 3.** The pair with two cases (before `route.abort()` came back): 30 rounds on 8 workers, 360 passed; with
   `taskset -c 0-3`, 360 passed. With the three cases: 480 passed and 60 skipped (Firefox's `route.abort()` pair), on
   8 workers and under `taskset -c 0-3` alike. The port race (another process taking the port between the probe's
   close and the app's listen) did not show in those runs; it would fail the test at `listen`, never pass it.
6. **Step 4.** 24 forms (20 on the test server, 4 on `page.route`), 72 tests on three browsers; 5 rounds on 8 workers,
   360 passed. The spec now checks `[location.href, document.URL]` for every form. `pnpm typecheck` (the doc
   comment's checks), `pnpm docs:build` and `pnpm lint:guide` passed. `git grep "document's URL"` finds only an
   unrelated unit-test comment.
7. **Stand-ins.** The specs add none; the four port forms keep theirs, disclosed in the comment. The probes behind the
   plan are disclosed in its *Probes*.
8. **Verification at the end**, at `c71fce8`: `pnpm test:unit`, 1006 passed; the full `pnpm pack-test --reporter=line`,
   exit 0 in 148 s, 1884 passed and 3 skipped, 36 step locations where they were called, the test server's 29 passed;
   `pnpm test:constrained --reporter=line`, exit 0 in 281 s, the same counts. The 21 more than PLAN-2I's run: 12 of
   `testGetBy.spec.ts`, 4 of the `route.abort()` pair on Chromium and WebKit, Firefox's 2 of the refused pair, 3 of the
   new host form. The 3 skipped are still 3: Firefox's refused pair runs now, its `route.abort()` pair is skipped.
9. **After the report**: the fix of 2 in `5b725e7`; the full `pnpm pack-test --reporter=line` on it, exit 0 in 146 s,
   1886 passed and 1 skipped (Firefox showed its error page after `route.abort()` in that run, so its pair ran), 36
   step locations, the test server's 29.
