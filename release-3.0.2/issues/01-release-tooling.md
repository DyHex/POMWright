**Title:** Move the release tooling to changesets CLI 3, changesets/action v2 and npm Trusted Publishing

**Labels:** backlog

---

`@changesets/cli` 3, `@changesets/changelog-github` 1 and `changesets/action` v2 move together: action v2 refuses CLI 2, and CLI 3 needs Node 22.11 and pnpm 10 or later.

Action v2 renames `publish` to `publish-script`, takes the token as `github-token`, and no longer writes `.npmrc` from `NPM_TOKEN`. npm authentication therefore moves to npm Trusted Publishing (OIDC), which the package owner configures on npmjs.com for `publish.yaml`. Trusted Publishing also gives provenance without `NPM_CONFIG_PROVENANCE`.

The move cannot be tried without publishing, so it is proven on a patch release.
