# 2A-9: A call of a helper without an origin that waited for its turn does not check the origin again, and acts on the origin the page moved to: it writes there, reads it, or clears it

- **Kind**: defect
- **Area**: turns: the origin check when a waiting call's turn starts (`SessionStorage.inTurn`)
- **Severity**: Medium (overlapping calls of a standalone helper and a navigation to another origin, a plausible edge case; a `clear()` that waited empties the other origin's storage, and a `get` returns the other origin's entries, silently)
- **Semver of the fix**: patch (behaviour brought in line with the documented turn-start check)
- **Pass**: 1
- **First review**: missed by the first review: present since 34c2ec0 (before 54cdada); A-1's fix (56229e2, decision 9: every call of every helper checks the origin before and after it) covers calls in flight, not a call of a helper without an origin that waited behind them, which reads the URL only once its turn has come
- **Reviewed**: `d850405`, 2026-10-28, Opus 5.5, second review, segment 2A

## Contract

- `website/src/content/docs/docs/session-storage.md`, *The methods*: "The order holds across helpers: every `SessionStorage` on a page, a page object's or a standalone one, waits for the earlier calls for its origin. **A call that waited checks the origin again when its turn comes, since the page may have left it meanwhile.**"
- `src/helpers/AGENTS.md`, *Session storage*: "a call that waited checks the origin again when its turn starts".
- `.changeset/storage-calls-take-turns.md`: "A call that waited checks the origin again when its turn comes, and throws the usual origin message if the page has left."
- `.changeset/batch-navigation-message.md` (56229e2): "Before, a navigation between two calls that both succeeded let the rest of a batch write into, or remove from, the other origin's storage."
- `src/helpers/sessionStorage.ts:448-453`, `inTurn`: "The origin is checked again when the turn starts, since the page may have left while the call waited."

## Reproduction

`/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/p09-unbound-waiting.spec.ts`. The page goes to `http://localhost:9000/teststorage` (A), with `http://127.0.0.1:9000` (B) visited first so its storage can be seen. `page.sessionStorage.setItem` is wrapped so that, after its third call returns, the page commits on B (the technique of `sessionStorage.spec.ts`, *the page commits on the other origin between two calls that both succeed*). Then, in one `Promise.all`, a four-key `set` and a second call of the same helper, which waits on A's chain:

```ts
const helper = new SessionStorage(page, { label: "Unbound" }); // or { label: "Bound", origin: A }
await Promise.all([helper.set({ k0: "A", k1: "A", k2: "A", k3: "A" }), helper.set({ late: "meant for A" })]);
// and, with B holding { "b-own": "B's own" }: Promise.all([helper.set(...), helper.get(), helper.clear()])
```

```sh
P=/home/magdys/workspace/dyhex/POMWright-second-review-probes/A
cp $P/p09-unbound-waiting.spec.ts test/tests/zz-probe-A-p09-unbound-waiting.spec.ts
pnpm -C test exec playwright test tests/zz-probe-A-p09-unbound-waiting.spec.ts --project=chromium --reporter=line
rm test/tests/zz-probe-A-p09-unbound-waiting.spec.ts
```

Exit code 0 (the probe prints).

## Observed / expected

```text
WAIT bound to A first: rejected: Bound.SessionStorage.set: the page navigated while set() was writing to http://localhost:9000; 2 of 4 keys were written (k0, k1); k2 was being written and may have reached the new document
WAIT bound to A second: rejected: Bound.SessionStorage.set: the page is on http://127.0.0.1:9000, not on this page object's origin http://localhost:9000; …
WAIT bound to A page on http://127.0.0.1:9000, its storage: {}
WAIT unbound first: rejected: Unbound.SessionStorage.set: the page navigated while set() was writing to http://localhost:9000; 2 of 4 keys were written (k0, k1); k2 was being written and may have reached the new document
WAIT unbound second: resolved undefined
WAIT unbound page on http://127.0.0.1:9000, its storage: {"late":"meant for A"}

WAIT get() that waited: resolved {"b-own":"B's own"}
WAIT clear() that waited: resolved undefined
WAIT clear page on http://127.0.0.1:9000, its storage: {}
```

A bound helper's waiting call fails at its turn, as documented. The same call from a helper without an origin resolves and acts on B: the write meant for A is in B's storage, `get()` returns B's entries as if they were A's, and `clear()` deletes B's entry. Expected: the waiting call checks the origin it waited for (A, the page's origin when it joined A's chain) and fails when the page has left it, as the bound helper's does; nothing reaches B.

## Cause

`src/helpers/sessionStorage.ts:454-461`, `inTurn`: the chain is chosen by `this.origin ?? onPage`, the page's origin when the call joins, but the check when the turn starts is `assertOnOrigin(method)` (`:424-434`), which returns at once when the helper has no origin (`this.origin === undefined`). So the origin the call waited for is never compared with the page's. `guarded` then reads the URL at the storage call, which is already B, so it sees no move. The call also runs outside B's chain, so it is not ordered with B's calls.

## Fix plan

- **Intended contract**: every call that waited compares the page's origin when its turn starts with the origin whose chain it joined, bound helper or not, and fails when they differ; a call on a page without a URL origin (the page-wide turn) compares the URL whole, as `guarded` does.
- **Options**:
  1. *(recommended)* In `inTurn`, keep the joined origin (`onPage`) and, in the turn, fail with a message for the helper without an origin when `originOf(page.url())` differs, for example `Unbound.SessionStorage.set: the page left http://localhost:9000 for http://127.0.0.1:9000 while set() waited for its turn; nothing was written`. A bound helper keeps its message. Cost: one comparison; a new message for the docs. Breaks nothing documented: the call that waited already had to check.
  2. Re-join the chain of the origin the page is on and run there: keeps "works on whatever origin the page is on" at the turn, but the call then acts on an origin it was not called on, which is what the docs' turn-start check exists to prevent.
- **Steps**: `SessionStorage.inTurn` (and the page-wide key) in `src/helpers/sessionStorage.ts`; the message in `api/errors.md`.
- **Tests**: unit (`storageTurns.test.ts`, *SessionStorage calls for one origin take turns*: "a call whose turn comes after the page left the helper's origin fails", for a helper without an origin too). Harness (`sessionStorage.spec.ts`, *the page commits on the other origin between two calls that both succeed*): the probe above for `set`, `get` and `clear` of a standalone helper without an origin, with B's storage unchanged; chromium is enough (the order is the helper's), all three in CI on `main`.
- **Docs**: `docs/session-storage.md` (*The methods*: the sentence stays true), `api/errors.md` (*Session storage*: the new message), `api/class-sessionstorage.md` (the *Throws* of `set`, `get`, `clear`), the `@throws` lines, `internal/seed-registry.md` (*Overlapping calls*).
- **Changeset**: patch, "a call of a standalone helper without an origin that waited for its turn fails when the page has left the origin, instead of acting on the new one".
- **Decisions**: option 1 or 2; the message.
- **Relative to other findings**: 2A-3 (inputs read late) touches the same methods; independent.
- **Sketch proposed** (segments.md, *A source sketch*): `/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/sketch/2A-9.diff` changes `src/helpers/sessionStorage.ts`:
  `inTurn` passes the origin whose chain the call joined to a new `assertStillOn`, which fails the call of a helper
  without an origin when the page is on another origin as its turn starts (`Unbound.SessionStorage.set: the page left
  http://localhost:9000 for http://127.0.0.1:9000 while set() waited for its turn; the call did nothing`); a call that
  took a page-wide turn is not checked (option 1's narrow form). `/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/sketch/2A-9.run.sh` runs `/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/sketch/2A-9.spec.ts` on chromium:
  the waiting `set`, `get()` and `clear()` of a helper without an origin fail and B's storage is untouched; controls: a
  bound helper's waiting call gets the origin message, and a helper without an origin still follows the page between
  awaited calls. It exits 0 when the contract holds and non-zero at `d850405`, where the waiting calls resolve (the
  reproduction above). Not run in the worktree (segment 2B held it when the sketch was written): the orchestrator applies it, runs `pnpm harness:install`, `run.sh`, the unit tests and the area's specs, and restores the worktree. Checked without the worktree: `git -C /home/magdys/workspace/dyhex/POMWright-second-review apply --check` exit 0; on a copy of the sources (`git archive d850405`) and `node_modules` in `/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/sketch/scratch/`, `biome check` exit 0 and `vitest run src/helpers` 301 passed with no type errors; a
  scratch-only unit probe (`/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/sketch/unitprobes/zz-probe-2A-9.test.ts`) fails without the diff and passes with it. The new
  message is not on `api/errors.md` yet, so `scripts/check-error-messages.mjs` (in `pnpm typecheck`) fails until the
  docs step above lists it.

## Fix sketch

Gate run by the orchestrator on 2026-10-28 in the review worktree at `d850405` (script: the orchestrator's `gate-sketches.sh`): the run script at `d850405`, then `git apply` of the diff and `pnpm harness:install`, the run script again, `pnpm test:unit`, and the area's specs on chromium; then `git checkout -- .`, and at the end the baseline package rebuilt (`dist/index.js` matches the baseline byte for byte) and the worktree clean. Log: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/sketch/2A-9.gate.out`.

- At `d850405`: `2A-9.run.sh` exit 1 (2 failed: the waiting calls resolved on the other origin, `{"b-own":"B's own"}` read). With the sketch: exit 0 (4 passed, the two controls included). Unit tests 904 passed; the session storage specs on chromium 88 passed.
- **Verdict: approved; a narrow fix suffices.** For the fix plan: the sketch adds a message, which *Error messages* must list, or `scripts/check-error-messages.mjs` fails `pnpm typecheck` (not run by the gate).
