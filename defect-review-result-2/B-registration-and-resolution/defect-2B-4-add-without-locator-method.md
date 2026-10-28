# 2B-4: an `add(path)` left without its locator method registers nothing and passes `verify()`, so the chains below it silently lose that segment

- **Kind**: design question
- **Area**: B-13 the end of a registration, B-26 `verify()`, B-22 resolution (unregistered segments)
- **Severity**: Low (a typing slip or an edit that drops `.locator(…)` from a line; the chains below then match more
  widely than written, which a test notices only when the page has a second match outside the lost segment)
- **Semver of the fix**: patch or minor, by option (below); docs only: none
- **Pass**: 4
- **First review**: missed by the first review (the behavior predates `54cdada`; its `p05` ended registrations of every
  builder kind, but checked only that later calls throw)
- **Reviewed**: `d850405`, 2026-10-28T15:18:50+01:00, Opus 5.5, second review, segment 2B

## Contract

Decided and documented: `website/src/content/docs/internal/registry-records.md`, *When a record is written*: "A path is
registered by its locator method, not by `add(path)`. … A registration that never reaches a locator method registers
nothing." *Resolving locators*, *Segments without a locator*: an unregistered segment "is only a name that groups paths,
and resolution leaves it out of the chain". *Verifying a registry* (*Introduction*) promises that the mistakes that are
not compile errors "can be found without a browser, and POMWright finds them all at once"; its *What it does not
check* names "a path in the union that is never registered and never resolved", not an `add` that registered nothing.

## Reproduction

Probe `/home/magdys/workspace/dyhex/POMWright-second-review-probes/B/p10/dangling-add.mjs`: a page object whose
`defineLocators()` has `this.add("main.form@login");` without a locator method, between `main` and
`main.form@login.button@login`.

```sh
node /home/magdys/workspace/dyhex/POMWright-second-review-probes/B/p10/dangling-add.mjs
```

Exit 0:

```text
verify passed; chain: locator('main').getByRole('button', { name: 'Log in' }) | count: 1
resolving the ancestor itself: No locator schema registered for path "main.form@login".
```

The page object is built and checked without an error; the button's chain has no form segment. TypeScript accepts
`this.add("main.form@login");` as a statement.

## Argument

The registry knows the mistake when it happens: `endOpenRegistration` (`src/locators/locatorRegistry.ts:161-175`) ends
a registration whose builder never got a definition (`locatorRegistrationBuilder.ts:113`, `definition` still
`undefined`), and drops it. A registration with no locator method has no use: it registers nothing and its builder
then only throws. When its path is an ancestor of registered paths, the omission changes every chain below it without a
word, the failure mode *Resolving locators* warns against ("A chain with too few segments finds a similar element
elsewhere"). `strictChains: true` reports the missing ancestor, but it is opt-in and never the default, and a leaf
`add` left without its method is reported by neither check until the path is resolved.

Cost of changing it: one flag recorded at the end of a registration and one more line in `verify()`; a registry that
holds such an `add` today, which can only be a mistake, would fail its check.

## Fix plan

Options, if adopted:

1. *(recommended)* `verify()` reports every `add(path)` that ended without a locator method, on that path's line, for
   example `"main.form@login": add("main.form@login") was ended by add("main.form@login.button@login") without a locator
   method; call one of getByRole, …, getById, or remove the add.` The registry keeps the ended-without-definition paths
   in a set (filled in `endOpenRegistration`, emptied of a path that is registered later); `verify()` ends the open
   registration first, so the last one is covered. In a page object the check after `defineLocators()` fails with its
   label, as for any registry mistake. Semver: patch if read as bringing `verify()` in line with "finds them all at once";
   a registry that passed before fails now, so the changeset says so.
2. Throw at the call that ends such a registration. Rejected here: the error would come from an unrelated, later call.
3. Docs only (none): *Verifying a registry*, *What it does not check*, names it, and *Registering locators* says that
   `add(path)` alone registers nothing and that `strictChains: true` reports it when the path is an ancestor.

Implementation (option 1): `LocatorRegistryInternal` (`endOpenRegistration`, `verify`), `LocatorRegistrationBuilder`
(a getter for "has a definition"); unit tests in `locatorRegistry.test.ts` (a dangling ancestor and a dangling leaf,
the last registration ended by `verify()`, a dangling `add` whose path is registered later by another `add`); a harness
case in `registry.verify.spec.ts`; *Verifying a registry* (*What it finds*), *Internal → Resolution* (*What it
reports*), `api/errors.md` (*Resolving and verifying*), `verify()`'s `@throws`; changeset patch: "`verify()` reports an
`add(path)` that was never given a locator method; before, it registered nothing, and the chains below it left the
segment out." Decision to tick: whether a registry that passes today may fail `verify()` in a patch.
