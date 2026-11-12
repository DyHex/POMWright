# Lenses

Ways to look at an item beyond its stated contract, each with what counts as a finding and the evidence it needs. The
profile selects the lenses that apply. A lens finding needs its consequence shown: a probe, a diff of two copies that
diverged, a call site, a log line, a measurement. Without one it stays out of the report: an opinion about style is not
a finding. A lens finding that breaks a contract is a confirmed defect; one that breaks none, with its consequence
shown, is a design question.

- [Design](#design)
- [Tests](#tests)
- [Docs](#docs)
- [Configuration and operations](#configuration-and-operations)
- [Security](#security)
- [Performance and resources](#performance-and-resources)
- [Standards and practices](#standards-and-practices)

## Design

What counts:

- **An invariant enforced in more than one place, disagreeing**: two validators of one input that accept different
  values; a limit checked at one entry point and not its sibling. Evidence: the two places, and an input that one
  accepts and the other rejects, probed.
- **Duplicated logic that has already diverged**: two copies of a calculation, a parser or a mapping, one fixed and
  one not. Evidence: the diff, and a probe where they give different results.
- **Error handling that loses information**: an exception swallowed, a cause dropped when wrapping, every failure
  mapped to one generic message, a retry that hides the first error. Evidence: a probe whose failure the user cannot
  diagnose from what the system reports.
- **Coupling that makes a stated contract impossible to keep**: a promise in the docs that the structure cannot
  deliver (a "stateless" handler reading a global, an "atomic" operation spread over two stores). Evidence: the call
  path and a probe that breaks the promise.
- **An abstraction its callers all work around**: every caller repeats the same pre- or post-processing, or bypasses
  it. Evidence: the call sites, and what a caller gets wrong when it forgets.

Not a finding: a structure you would have chosen differently, with no consequence shown.

## Tests

What counts (in the coverage section's test gaps, not among the defects):

- A stated contract no test exercises, or exercised only on its easiest path.
- Tests that run against the source where users get a built artifact, or in one environment where several are
  supported.
- Tests that cannot fail: assertions on a value the test itself set, a mocked dependency that returns what the
  assertion expects, a check that a call did not throw while the test ignores its result.
- Tests that pass by timing: sleeps, retries that hide flakiness, an order that depends on the previous test.
- A test that pins a defect as expected behavior: then the defect is the finding, and the test is its evidence.

Evidence: the contract, and the test that should cover it (or its absence, from a search).

## Docs

What counts:

- An example that does not run, or prints something else than the page shows. Evidence: the example run as written,
  and its output.
- A statement the behavior contradicts. Evidence: the page and a probe.
- Two pages, or a page and a doc comment, that disagree.
- A feature, option, error or limit a user needs that no page states; a migration step missing for a change that breaks
  existing code.
- A broad claim ("everything is validated", "identical to X") that a narrower contract contradicts.

## Configuration and operations

What counts:

- Defaults that are unsafe or differ between environments without the docs saying so.
- Settings documented but unused, used but undocumented, or read under two names.
- Secrets in the repository, in images, in logs, in error messages, in client bundles, or passed on command lines that
  other users can read.
- Dependencies unpinned where reproducibility matters, a lockfile out of step with the manifest, versions in CI that
  differ from what ships.
- CI that tests something other than what is published or deployed (another commit, another build, another
  configuration).
- Errors logged without what an operator needs to act (which request, which input, which dependency), or not logged.
- Health checks that pass while the system cannot serve; shutdown that drops in-flight work.

Evidence: the file and line, and where behavior is claimed, a run that shows it.

## Security

Kept to defects with evidence, probed safely (SKILL.md's safety rule). This is not a penetration test.

What counts:

- Input that reaches an interpreter, a shell, a query, a template, a file path or a URL fetch without escaping or
  validation. Evidence: a harmless payload in a local environment that shows the input changing the command, query or
  path.
- Authorization checked on one path and not on its sibling (another method, another route version, a bulk endpoint,
  an export). Evidence: two requests in a local environment, one refused and one served.
- Secrets or personal data in logs, errors, URLs, caches or the repository.
- Cryptography misused: a fixed or predictable value where randomness is required, a home-made scheme, a verification
  skipped (certificates, signatures), passwords stored reversibly.
- Dependencies with known vulnerabilities on a path the system uses: name the advisory, and show the path.

Never probe a system you do not control, and never use a payload that could harm data or availability.

## Performance and resources

Kept to defects with evidence where the contract or reasonable use implies a bound. This is not a benchmark campaign.

What counts:

- Unbounded growth: memory, files, connections, threads, queue length or retries that grow without limit over normal
  use. Evidence: a measurement over repeated use that keeps growing.
- Work that grows faster than its input where the contract implies otherwise: a quadratic loop over user data, a
  query per item. Evidence: timings at two or three input sizes, on the same machine, repeated.
- Leaks on error paths: a handle, a lock or a subscription not released when an operation fails or is cancelled.
  Evidence: a count before and after repeated failing calls.
- Timeouts missing on calls to dependencies, or longer than the caller's own.

Say the machine and the runs a measurement came from; a single run on a busy machine shows nothing.

## Standards and practices

The standards the profile lists (the language's and frameworks' conventions, the platform's guidelines, the domain's
rules, the project's own guide) are a lens too:

- A departure from one, or a standard the context calls for and the system does not use, is asked about before it is
  reported: "is this a choice with a reason?" Batch the questions in one message to the user where you can; otherwise
  list them under *Design questions* as asked.
- A departure that breaks a contract or causes a shown consequence is reported as a defect or a design question,
  whatever the answer.
- A choice with a reason that no longer holds (the dependency it worked around is fixed, the platform changed) is a
  design question, with the evidence that the reason is gone.
