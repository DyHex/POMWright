# Security policy

## Supported versions

Only the latest major version gets security fixes, each released as a new version of that major; its earlier releases
are not patched separately. When a new major is released, the one before it stops getting fixes.

| Version       | Security fixes |
| ------------- | -------------- |
| 3.x           | Yes            |
| 2.x and older | No             |

To move from 2.x, see [Upgrading from 2.x](https://dyhex.github.io/POMWright/docs/upgrading-from-2x/).

To move from 1.x, see the
[1.x to 2.x migration guide](https://github.com/DyHex/POMWright/tree/v2.1.0/docs/v1-to-v2-migration) at the `v2.1.0`
tag, then *Upgrading from 2.x*.

## Reporting a vulnerability

Report it privately through GitHub: the repository's **Security and quality** tab, then **Report a vulnerability**
([direct link](https://github.com/DyHex/POMWright/security/advisories/new)). Don't open a public issue, discussion or
pull request for it, and keep it private until the advisory is published.

Include as much of this as you can:

- the versions of `pomwright`, `@playwright/test` and Node;
- what an attacker can do, and what they need control over to do it;
- steps to reproduce, ideally a minimal test or page;
- a suggested fix, if you have one.

## What happens next

- A maintainer replies in the advisory, either confirming the issue or explaining why it isn't one.
- A fix is prepared privately, then merged and released as a new version.
- Once that version is on npm, the advisory is published. When the issue warrants one, a CVE is requested through
  GitHub. You are credited unless you ask not to be.

There is no fixed response time. If you have had no reply within two weeks, comment on the advisory.

## Scope

POMWright is a library that runs inside your Playwright Test process, with the same permissions as your tests, and
takes its input from the test code you write.

In scope:

- **The published `pomwright` package**: behavior that a page under test, or other input your tests don't control, can
  exploit.
- **The release pipeline**: anything that would let someone other than a maintainer publish `pomwright` to npm, change
  what is published, or forge its provenance. This includes the workflows in `.github/workflows/`.
- **The agent skills in `skills/`**: instructions that lead an agent to do more than its user asked, such as changing
  data on a site it only maps, or exposing credentials.
- **The docs site** at <https://dyhex.github.io/POMWright/>.

Not in scope:

- Anything that requires control over your test code, Playwright configuration or fixtures. That code already runs with
  your permissions.
- Vulnerabilities in Playwright, the browsers or Node. Report those to the project concerned.
- Alerts for development dependencies that affect neither the published package nor the release pipeline. The package
  has no runtime dependencies.
- Values in test output. Error messages quote the values involved, such as a session-storage value that fails to
  decode, so those values can appear in reports and CI logs.

## Verifying a release

Releases 3.0.2 and later are published by `.github/workflows/publish.yaml` through npm Trusted Publishing, with a
provenance attestation, and no npm token can publish the package. To check a release:

```sh
npm view pomwright@<version> dist.attestations   # the provenance entry; prints nothing when there is none
npm audit signatures                             # in a project with pomwright installed: verifies the attestations
```

`npm audit signatures` verifies the attestations it finds but does not report a package that has none, so the first
command is the one that shows whether a release has provenance. A release of 3.0.2 or later that has no provenance was
not published by this repository's workflow: report it as above.
