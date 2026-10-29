# 2A-10: The opaque-origin message is lost on a sandboxed document whose script declares a global `origin`, because the check reads `self.origin` in the page's world

- **Kind**: defect
- **Status**: decided 2026-10-29, decision 83 in [DECISIONS.md](../DECISIONS.md) (with 2A-2/2A-10: one evaluation of `document.domain`); planned with the other session storage items
- **Area**: `set`, `get`, `clear`, an on-origin `seed`: the opaque-origin explanation (`SessionStorage.access`)
- **Severity**: Low (needs a sandboxed document that runs scripts and has a global named `origin`; the call still fails, but with the browser's wording, which on WebKit is "The operation is insecure.")
- **Semver of the fix**: patch (the message promised "on every browser" for such a document)
- **Pass**: 1
- **First review**: missed by the first review: present since 17426a5 (before 54cdada), which added the check; A-5's fix (186bc5f) reworded its message
- **Reviewed**: `d850405`, 2026-10-28, Opus 5.5, second review, segment 2A

## Contract

- `.changeset/sandboxed-document-message.md`: "On a document whose own origin is opaque, such as one served with `Content-Security-Policy: sandbox` without `allow-same-origin`, … `set`, `get`, `clear` and an on-origin `seed` fail with `Shop.SessionStorage.set: the document at … cannot use sessionStorage: its origin is opaque (…)` on every browser."
- `docs/session-storage.md`, *Through a page object*: "A document whose own origin is opaque has no session storage at all, so every call there fails too, saying so: a document served with `Content-Security-Policy: sandbox` without `allow-same-origin`, …".
- The project already decided that a page's own globals must not mislead these checks: `internal/seed-registry.md`, *The checks in `seed`*: "The check tests the `NavigationActivation` interface, not `navigation.activation`: an app's own global `navigation` (`var navigation = …`) shadows the latter in its document" (bfbc00f).

## Reproduction

`/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/p13-shadowed-origin.spec.ts`: `page.route` answers `http://localhost:9000/zz-sandboxed-scripts` with `Content-Security-Policy: sandbox allow-scripts` (as the harness's `/teststorage/sandboxed` does) and a body whose script is either empty or `var origin = location.origin;`; then `testStorage.sessionStorage.set("token", "x")`.

```sh
P=/home/magdys/workspace/dyhex/POMWright-second-review-probes/A
cp $P/p13-shadowed-origin.spec.ts test/tests/zz-probe-A-p13-shadowed-origin.spec.ts
pnpm -C test exec playwright test tests/zz-probe-A-p13-shadowed-origin.spec.ts --project=chromium --reporter=line
rm test/tests/zz-probe-A-p13-shadowed-origin.spec.ts
```

The same with `--project=firefox` and `--project=webkit`; exit code 0 each (outputs `p13-shadowed-origin.<browser>.out`).

## Observed / expected

Without the global, on every browser:

```text
SHADOW "" main world self.origin: null
SHADOW "" set: rejected: TestStorage.SessionStorage.set: the document at http://localhost:9000/zz-sandboxed-scripts cannot use sessionStorage: its origin is opaque (the browser's error page after a failed navigation, or a sandboxed document: Content-Security-Policy: sandbox without allow-same-origin)
```

With `var origin = location.origin;`:

```text
chromium: SHADOW "var origin = location.origin;" main world self.origin: http://localhost:9000
          … set: rejected: TestStorage.SessionStorage.set: webStorage.setItem: SecurityError: Failed to read the 'sessionStorage' property from 'Window': The document is sandboxed and lacks the 'allow-same-origin' flag.
firefox:  … set: rejected: TestStorage.SessionStorage.set: webStorage.setItem: Window.sessionStorage getter: Forbidden in a sandboxed document without the 'allow-same-origin' flag.
webkit:   … set: rejected: TestStorage.SessionStorage.set: webStorage.setItem: SecurityError: The operation is insecure.
```

Expected: the opaque-origin message on every browser, as without the global. `self.origin` is a `[Replaceable]` attribute of `Window`, so a page's `var origin = …` replaces it in the page's world, where `page.evaluate` runs.

## Cause

`src/helpers/sessionStorage.ts:333`: `this.page.evaluate(() => self.origin === "null")`, in the main world. The same read is in `assertInheritedOrigin` (`:444`) and in `seed`'s `writeOnOrigin` (`:686`), where the document is an `about:blank` popup and an app's global there is far less likely. `seedScript` is not affected: it runs before the document's first script.

## Fix plan

- **Intended contract**: the check tells an opaque document apart whatever the page declares, as the Navigation API check does since bfbc00f.
- **Options**:
  1. *(recommended)* Read an origin the page cannot replace with a declaration: for example `document.domain === ""` together with `self.origin`, or the property descriptor of `origin` taken from a fresh realm (`document.createElement("iframe")` is too heavy); to be probed on the three browsers before choosing. Cost: one expression; the decision recorded with bfbc00f's in `internal/seed-registry.md`.
  2. Decide from the browser's error instead: its wording differs on each engine (above), and the code's own comment rejects it ("the browsers word the refusal differently").
  3. Leave it and document that an app's global `origin` hides the explanation.
- **Steps**: `SessionStorage.access`; the same expression in `assertInheritedOrigin` and `writeOnOrigin` for consistency.
- **Tests**: harness, all three browsers: the sandboxed route with a script that declares `origin` (a variant of `/teststorage/sandboxed`, as `/teststorage/shadowed-navigation` is for `navigation`), `set`, `get` and an on-origin `seed` give the opaque message.
- **Docs**: `internal/seed-registry.md` (*The checks in `seed`*, or a note under *The origin around every call*): the check reads an origin a page cannot shadow.
- **Changeset**: patch, "the opaque-origin message also appears when the document declares a global named `origin`".
- **Decisions**: the expression (option 1, after a probe).
- **Relative to other findings**: 2A-2 changes the same method (`access`); fix them together.
- **Sketch proposed** (segments.md, *A source sketch*): `/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/sketch/2A-10.diff` changes `src/helpers/sessionStorage.ts`,
  `access`: the opaque check is `self.origin === "null"`, or else the `sessionStorage` getter throws, which it does in a
  document whose origin is opaque and which no declaration replaces (it has no `[Replaceable]` setter). The probe's
  messages show the getter throwing on Chromium and Firefox; WebKit's ("The operation is insecure.") does not say, and
  the run settles it. `/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/sketch/2A-10.run.sh` runs `/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/sketch/2A-10.spec.ts` on chromium, firefox and webkit: a CSP-sandboxed
  document with scripts, with and without `var origin = location.origin;`, gives the opaque message for `set` and
  `get`; control: a refused write (12 MiB) on an ordinary document is not called opaque. Firefox's error page is covered
  by `sessionStorage.spec.ts`, *a document with an opaque origin*, among the area's specs. It exits 0 when the contract
  holds and non-zero at `d850405`, where the shadowed case gives the browser's wording (the reproduction above).
  Not run in the worktree (segment 2B held it when the sketch was written): the orchestrator applies it, runs `pnpm harness:install`, `run.sh`, the unit tests and the area's specs, and restores the worktree. Checked without the worktree: `git -C /home/magdys/workspace/dyhex/POMWright-second-review apply --check` exit 0; on a copy of the sources (`git archive d850405`) and `node_modules` in `/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/sketch/scratch/`, `biome check` exit 0 and `vitest run src/helpers` 301 passed with no type errors. It conflicts textually with
  2A-2's sketch (the same lines of `access`). `assertInheritedOrigin` and `seed`'s `writeOnOrigin` still read
  `self.origin`, on an `about:blank` popup, where an app's global is unlikely.

## Fix sketch

Gate run by the orchestrator on 2026-10-28 in the review worktree at `d850405` (script: the orchestrator's `gate-sketches.sh`): the run script at `d850405`, then `git apply` of the diff and `pnpm harness:install`, the run script again, `pnpm test:unit`, and the area's specs on chromium; then `git checkout -- .`, and at the end the baseline package rebuilt (`dist/index.js` matches the baseline byte for byte) and the worktree clean. Log: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/sketch/2A-10.gate.out`.

- At `d850405`: `2A-10.run.sh` exit 1 (4 failed: the opaque message lost on chromium, firefox and webkit with `var origin`, and the control on firefox). With the sketch: exit 1, with 1 failed and 8 passed: the opaque message holds on all three browsers, with and without `var origin`; the one failure is the probe's control on firefox, which also failed at `d850405`. Its first assertion expects `QuotaExceededError` in the message, and Firefox words the refusal "The quota has been exceeded."; its second, that the refused write is not called opaque, holds. Unit tests 904 passed; the session storage specs on chromium 88 passed.
- **Verdict: approved; the cause is confirmed.** The failure is the probe's, not the sketch's. For the fix plan: the sketch also treats a `sessionStorage` getter that throws as an opaque origin, and a getter can throw for other reasons (storage disabled by the browser's settings or policy), so the fix needs a test that tells those apart.
