# 2T-7: The test-server check does not see a WebSocket to another host, nor a protocol-relative URL loaded on a click or a timer

- **Kind**: defect
- **Status**: decided 2026-10-29, decision 100 in [DECISIONS.md](../DECISIONS.md) (WebSockets, wss, //host and routers' routes); planned in the checks plan
- **Area**: the test server's external-request check: `test/test-server/externalRequests.spec.ts`
- **Severity**: Low (no page does either today; the check's stated coverage is wider than what it checks)
- **Semver of the fix**: none (test only)
- **Pass**: 1
- **First review**: new since 54cdada (0905892, ac0832c)
- **Reviewed**: `d850405`, 2026-10-28T18:45+01:00, Opus 5.5, second review, segment 2T

## Contract

- `externalRequests.spec.ts:6-12`: "No page of the test server loads anything from another host ... Each page opens in a
  browser context of its own, and every request that context reports is checked ... A scan of the server's source and
  its test data covers what opening the pages cannot reach: the POST routes, and anything a page would load only on a
  click or a timer."
- `test/AGENTS.md`, *The harness*: "No page loads anything from outside the test server ... runs one test per page ...
  that checks every request, and scans `server.js` and `test-data/` for any other host (an XML namespace aside)".

## Reproduction

1. The scan's regex and host test, copied verbatim (the probe prints the spec's own lines first), over sample lines:
   `/home/magdys/workspace/dyhex/POMWright-second-review-probes/T/test-server/scan-replica.mjs`.

   ```sh
   node /home/magdys/workspace/dyhex/POMWright-second-review-probes/T/test-server/scan-replica.mjs /home/magdys/workspace/dyhex/POMWright-second-review
   ```

   exit 0:

   ```text
   absolute https: flagged https://cdn.example/a.js
   protocol-relative, on a click: NOT flagged
   protocol-relative stylesheet: NOT flagged
   WebSocket: NOT flagged
   CSS url() protocol-relative: NOT flagged
   ```

2. What the browser half's listener reports. A temporary spec in `test/test-server/` (source
   `.../T/test-server/zz-probe-T-ws.spec.ts`), run through the check's own config and removed:

   ```sh
   pnpm -C test exec playwright test -c playwright.test-server.config.ts zz-probe-T-ws --reporter=line
   ```

   exit 0; it opens `/testids`, then creates `new WebSocket("ws://127.0.0.1:9000/feed")` and a script with
   `src="//192.0.2.2/a.js"`, and prints what `context.on("request")` (the check's listener) and `page.on("websocket")`
   saw:

   ```text
   {"requests":["http://localhost:9000/testids","http://192.0.2.2/a.js"],"websockets":["ws://127.0.0.1:9000/feed"]}
   ```

   The protocol-relative script loaded at once is reported (so a load-time one is caught by opening the page); the
   WebSocket is not a request to the context.
3. A sketch for the orchestrator runs the real check on a page with both: `sketch/2T-7.diff` adds to `/testnav`'s script
   `new WebSocket('wss://socket.example/feed');` and a click handler `fetch('//cdn.example/api')`;
   `sketch/2T-7.run.sh` runs `bash test-server-check.sh --reporter=line` and exits 0 only when the check fails. Expected
   at `d850405`: the check passes (the WebSocket is not a request; the scan matches neither `wss://` nor `//host`), so
   the script exits 1.

## Observed / expected

Observed: a page that opens a WebSocket to another host at load passes the browser half (the context reports no request
for it) and the scan (`/https?:\/\/.../`); a protocol-relative URL (`//host/...`, in a `fetch`, an `href`, a CSS
`url()`) loaded only on a click or a timer passes both.

Expected, as the spec says: anything a page would load from another host fails the check, on load through the browser
half, and otherwise through the scan.

## Cause

`externalRequests.spec.ts:54` listens to `context.on("request")`, which Playwright does not emit for WebSockets
(`page.on("websocket")` does); `:69` scans for `https?://` only.

## Fix plan

- **Intended contract**: no page of the test server reaches another host by any request, WebSocket or URL in its
  source.
- **Options**:
  1. (recommended) Listen to `page.on("websocket")` as well and check its URL's host; widen the scan to
     `/(?:https?|wss?):\/\/[^...]+|(?<![:\w])\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'`<>),\\]*/gi` (a `//` that starts a host
     name, not a path's `//` or a comment's `// text`). Cost: the protocol-relative pattern needs care not to match a
     JavaScript comment such as `// LOCATION` or `// the`; requiring a dotted host name after `//` and no word
     character before it keeps the current files clean (to be confirmed by running the scan over them).
  2. Narrower: say in the spec's header and `test/AGENTS.md` that the scan finds absolute `http(s)` URLs only. Cost:
     the gap stays.
- **Implementation steps**: `test/test-server/externalRequests.spec.ts`, the listener and the scan.
- **Tests**: the sketch, applied, must fail the check; the unchanged server must pass.
- **Docs**: `test/AGENTS.md`'s sentence on the scan, if the forms it covers are listed.
- **Changeset**: none.
- **Decisions to tick**: none.
- **Related**: a route mounted through an `express.Router()` is not listed by the spec's route walk (it reads only
  `app.router.stack`'s own routes), so its page would not be opened; no such route exists, noted in `summary.md`.

## Fix sketch

Gate run by the orchestrator on 2026-10-28 in the review worktree at `d850405` (script: the orchestrator's `gate-sketches.sh`, without a rebuild: the sketch changes no packaged file). This sketch is a demonstration, not a fix: it breaks what the check guards, and its run script exits 0 only when the check catches the break. The finding stands when the script still exits 1 with the break applied. Then `git checkout -- .` and the worktree clean. Log: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/T/sketch/2T-7.gate.out`.

- At `d850405`, without the break: `test-server-check.sh` 26 passed; the script exits 1, as expected.
- With the break applied (`/testnav` opens `wss://socket.example/feed` at load and fetches `//cdn.example/api` on a click): `test-server-check.sh` still 26 passed; the script exits 1: **the page went unnoticed.**
- **Verdict: the finding is confirmed.**
