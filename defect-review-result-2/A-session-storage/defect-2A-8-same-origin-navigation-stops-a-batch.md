# 2A-8: A navigation within the origin stops a batch and fails the call, although the origin's storage is the one being written

- **Kind**: design question
- **Status**: decided 2026-10-29, decision 86 in [DECISIONS.md](../DECISIONS.md) (the call keeps failing; the navigation messages name where the page went; docs); planned with the other session storage items; decision 114 (2026-10-29) extends it to a document replaced between two of a call's storage calls
- **Area**: `set`, `get`, `clear`, an on-origin `seed`: a storage call interrupted by a navigation (`SessionStorage.guarded`)
- **Severity**: Low (a test that writes storage while the app reloads or redirects within its origin fails, intermittently, with a message that suggests the writes went somewhere else)
- **Semver of the fix**: patch if adopted (a call that failed would succeed; nothing that worked changes)
- **Pass**: 1
- **First review**: missed by the first review (not discussed): present since v3.0.1 (Playwright's raw error then); labeled with the navigation message since e8831b8 (before 54cdada), kept by 56229e2 (A-1's fix)
- **Reviewed**: `d850405`, 2026-10-28, Opus 5.5, second review, segment 2A

## Contract (the decided behaviour)

- `src/helpers/sessionStorage.ts:347-380`, `guarded`: "when its origin moved, or the call failed because the document went away, the call fails with `navigated(from)`, whether or not it threw".
- `src/helpers/AGENTS.md`, *Session storage*: "fails with the navigation message when it moved, whether or not the call threw".
- `docs/session-storage.md`, *The methods*: "a navigation to another origin stops it". It does not say what a navigation within the origin does.
- The unit test `src/helpers/sessionStorage.test.ts` (*a call the page leaves while it succeeds*): "goes on after a navigation within the origin, whose storage is the same", for a call that succeeded.
- Playwright's own `page.sessionStorage.setItem` is one evaluation in the main frame (`playwright-core` `webStorageSetItem`, `mainFrame().evaluateExpression(…, { world: "utility" })`) and rejects with "Execution context was destroyed" when the document is replaced during it.

## Reproduction

`/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/p06-batch3.spec.ts`, test "SAMEORIGIN": on `http://localhost:9000/teststorage`, the page is sent to `http://localhost:9000/teststorage?again=<n>` 5 ms later, then `testStorage.sessionStorage.set(<60 keys>)`; six rounds.

```sh
P=/home/magdys/workspace/dyhex/POMWright-second-review-probes/A
cp $P/p06-batch3.spec.ts test/tests/zz-probe-A-p06-batch3.spec.ts
pnpm -C test exec playwright test tests/zz-probe-A-p06-batch3.spec.ts --project=chromium --reporter=line -g SAMEORIGIN
rm test/tests/zz-probe-A-p06-batch3.spec.ts
```

Exit code 0 on chromium, firefox and webkit (`p06-batch3.spec.out`, `p06-sameorigin.firefox.out`, `p06-sameorigin.webkit.out`). Every round, on every browser, fails, for example:

```text
rejected: TestStorage.SessionStorage.set: the page navigated while set() was writing to http://localhost:9000; 2 of 60 keys were written (k0, k1); k2 was being written and may have reached the new document
```

## Argument

The origin never moved: the keys written, the one in flight and the rest all belong to the same storage, which the new document shares. The helper fails the call because the in-flight evaluation was destroyed, then words it as if the writes might have gone astray ("may have reached the new document"), and leaves 58 keys unwritten. A test that writes storage just after `goto` while the app redirects itself within its origin (a login page that forwards to `/home`, a reload after a service worker update) fails some of the time, and the message sends the tester to look for a navigation to another origin.

What I would change: when the evaluation was destroyed and the page's origin is still the one at the start, repeat that key's call once the page has a document again, and go on with the batch. `setItem`, `removeItem`, `getItem` and `clear` are idempotent, and session storage belongs to the origin and the tab, which the HTML standard guarantees, so the repeat rests on no browser behaviour beyond that; it is not the retry `src/AGENTS.md` rules out (the seed after a failed navigation, which rests on how browsers present error pages).

Cost: a loop in `guarded`, and the call no longer mirrors `page.sessionStorage`, which fails here. The messages for a navigation to another origin stay as they are. If it is not adopted, the docs should say that a navigation within the origin can stop a call too, and the message could say "within the origin" in that case rather than "may have reached the new document".

## Fix plan (if adopted)

- **Contract**: a navigation within the origin never fails a storage call; one that leaves the origin fails it as now.
- **Options**: (1) *(recommended if adopted)* repeat the interrupted key's call in `guarded` while the origin is unchanged; (2) keep failing, and word the message for the same-origin case ("the page reloaded or navigated within https://shop.example while set() was writing; … k2 may not have been written") and document it in *The methods*.
- **Steps**: `SessionStorage.guarded` in `src/helpers/sessionStorage.ts`.
- **Tests**: unit: a fake call that rejects with the destroyed-context message while the URL stays on the origin, then resolves. Harness: the probe above as a spec on all three browsers, the batch complete and every key stored.
- **Docs**: `docs/session-storage.md` (*The methods*), `internal/seed-registry.md` (*The origin around every call*), the `@throws` of `set`, `get`, `clear`.
- **Changeset**: patch, "a navigation within the origin no longer stops a session storage call".
- **Decisions**: whether the helper may differ from `page.sessionStorage` here.
