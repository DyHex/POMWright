# Draft: the issue "3.0.2 release: after the merge"

Decision 111's draft, finalized on 2026-10-30 from the first review's records (`defect-review-result/PLANS.md`, *The
maintainer's actions outside the plans*; `DECISIONS.md` 20, 38, 72, 75; `PLAN-release-gates-and-audit.md`'s notes on
the issues) and the issues as GitHub shows them today (#53, #54, #55, #56, #58, #61, #62, read through the public API).
For the maintainer to file before the cleanup; the issue names no plan, finding or decision, since the folders are
deleted.

Title: `3.0.2 release: after the merge`

---

Steps left after PR #60, from the 3.0.2 working folders, which were removed before the merge.

**Right before the merge**

- [ ] The Trusted Publisher for `pomwright` on npmjs.com: repository `DyHex/POMWright`, workflow `publish.yaml`,
  environment `npm`, **Allow npm publish**. Its first publish must succeed within 2 days.
- [ ] PR #60 merged with a merge commit (its commits are cited by hash).

**After the merge**

- [ ] The first Publish run deploys to the `npm` environment, succeeds and opens the Version Packages pull request.
- [ ] The Version Packages pull request's `PR` run approved on the pull request (GitHub holds a run that
  `github-actions[bot]` started until a maintainer approves it), then the pull request merged within the Trusted
  Publisher's 2 days.
- [ ] The diagrams checked on the live site; an older green `CI` run re-run once: Pages skips its deploy.
- [ ] Issue #55's body: CI runs the chromium harness on every LTS Node line below the default, from the `engines`
  floor (20 and 22, the `harness-node` matrix; there is no `harness-node-floor` job any more), and 24 joins that matrix
  when 26 becomes the default.

**After the release**

- [ ] The attestation: `npm view pomwright@3.0.2 dist --json`.
- [ ] npm publishing access for `pomwright`: "Require two-factor authentication and disallow tokens".
- [ ] The old npm token revoked, and the repository's `NPM_TOKEN` secret deleted.
- [ ] Issue #53 closed: the release tooling it proposes (changesets CLI 3, `changesets/action` v2, npm Trusted
  Publishing) shipped with 3.0.2.
- [ ] Issue #54's body: the compiler-API users are tsup's declaration build, `scripts/check-api-coverage.mjs`,
  `scripts/check-error-messages.mjs` and `scripts/generate-emit-members.mjs`; `scripts/check-doc-snippets.mjs` runs
  `tsc` and uses no compiler API.
- [ ] Issue #56: a comment that the publish job builds the package while the publishing credentials are in reach, a
  second reason to publish the tarball CI tested.
- [ ] Issue #58: nothing to post; its body already holds the update (the pairings of type and value that fail to
  compile since 3.0.2, the two that still compile, and the design note).
- [ ] Issue #61: its 3.x half shipped in 3.0.2. Decide whether 2.x gets the fix, as 2.1.1 under a dist-tag other than
  `latest` (the issue's *Notes for the 2.x release*), or close the issue without a 2.x release.
- [ ] Issue #62's migration list names the README's example that logs with `log.info` (the entry a passing test does
  not attach at the default level).
