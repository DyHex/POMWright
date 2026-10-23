# GitHub issues to create (drafts)

Work for later, as issues in `DyHex/POMWright` instead of `AGENTS.md` section 7 (PLAN-R3, item 7). The user creates
them by hand (decided 2026-10-22); each has a file to copy from in [issues/](issues/), with its title, labels and body.
The texts below are the working drafts; the files are what gets posted.

Label: one label for all of them, proposed `backlog`, so `AGENTS.md` can say `gh issue list --label backlog`. Issue 6
also gets `breaking`. Both labels are created if they do not exist.

---

## 1. Move the release tooling to changesets CLI 3, action v2 and npm Trusted Publishing

`@changesets/cli` 3, `@changesets/changelog-github` 1 and `changesets/action` v2 move together: action v2 refuses CLI
2, and CLI 3 needs Node 22.11 and pnpm 10 or later.

Action v2 renames `publish` to `publish-script`, takes the token as `github-token`, and no longer writes `.npmrc` from
`NPM_TOKEN`. npm authentication therefore moves to npm Trusted Publishing (OIDC), which the package owner configures on
npmjs.com for `publish.yaml`. Trusted Publishing also gives provenance without `NPM_CONFIG_PROVENANCE`.

It cannot be tried without publishing, so it is proven on a patch release.

## 2. TypeScript 7

Move to TypeScript 7 once it ships a compiler API. tsup's declaration build, `scripts/check-doc-snippets.mjs` and
`scripts/check-api-coverage.mjs` use the compiler API, which TypeScript 7 does not have yet.

## 3. Node 26 for contributors and in CI

Once Node 26 is LTS, contributors and CI move from Node 24 to 26. The `harness-node-floor` job stays on the `engines`
floor (Node 20).

## 4. Publish the tarball CI tested

`publish.yaml` rebuilds the package (`pnpm run release`) instead of publishing the tarball the `package` job built and
the harness tested. Two builds of one commit are byte-identical today, but the published bytes are not the tested bytes.
Closing the gap changes how changesets publishes: the artifact has to be retrieved, checked against the commit and its
digest, and published in place of the rebuild.

## 5. A browser-context-wide `seed` option

`seed` adds an init script to one page, so a hop that opens a new tab or popup does not get the entries. Today the docs
show `browserContext.addInitScript` as the workaround. A context-wide option would cover new pages. Non-breaking.

## 6. Write the session storage schema once (breaking)

Today a page object writes its schema twice: the type in its type options (`{ storage: typeof schema }`) and the value
in the constructor's options (`sessionStorage: { schema }`). Nothing checks that both are there; with the type and
without the value, the declared keys are stored and read without their codecs (3.0.1 finding, PLAN-D8; 3.0.2 adds a
docs note and a hint in the runtime message).

Making the value required when the type is declared breaks the documented generic base class (TypeScript cannot
resolve the conditional parameter for a generic `Options`). The fix is to write the schema once, as a value, and infer
the type from it. TypeScript never infers a base class's type arguments from `super(…)`, so the value has to move to
where inference happens. One shape, probed as a model with TypeScript 6.0.3:

```ts
const AccountBase = PageObject.withSessionStorage({ user: json<{ name: string }>() });

export class AccountPage extends AccountBase<Paths> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/account");
  }
}
```

It removes the `storage` type option and the `sessionStorage.schema` option, so it is a major and needs a design:
base classes, forwarding, docs, migration.

## 7. An option to treat an empty `?` or `#` as the same page

3.0.2 makes `expectThisPage()` and `expectAnotherPage()` compare URLs as Playwright's `toHaveURL` does: `/orders?` and
`/orders#` are different URLs from `/orders`. A page-object option could treat an empty query or fragment as absent, the
page-object view in which an empty query carries nothing. It would be per page object (for example in `navOptions`), so
that the two methods stay exact opposites. A RegExp path (`/^\/orders\??$/`) covers it today. A minor, if someone asks
for it.

## 8. Apply a pending seed on the retry after a failed navigation to its origin (not filed)

Not filed, decided 2026-10-23 ([DECISIONS.md](DECISIONS.md) 34): keeping a test going after a failed navigation is
not `seed`'s business. The text below records the reasons.

From PLAN-D18-D19-D28 (decision 31). On Chromium and Firefox the retry after a failed navigation to a seeded origin
sees the browser's error page as its previous document (`navigation.activation.from`), so the seed script does not
write. 3.0.2 makes that fail the test instead of passing silently. Making the plain retry apply the seed would rest on
browser behaviour without a guarantee (the error entry as `from`, the URL Firefox commits its error page at, the order
of `requestfailed` and the commit, Playwright's error texts for aborted requests); worth doing if retried navigations
turn out to be common, after probing each of those on the then-current Playwright.
