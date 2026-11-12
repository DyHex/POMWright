# System profiles

What the review profile holds, and for each kind of system: where its contracts are stated, what its inventory adds,
the order of its risks, where its behavior lives (how to probe it for real), and how the impact of a fix is judged. A
system is often several kinds at once (a service with a web front end and infrastructure code): take each kind's
section for its part.

- [The profile](#the-profile)
- [Library or package](#library-or-package)
- [Web or HTTP service](#web-or-http-service)
- [Web front end](#web-front-end)
- [Desktop or mobile app](#desktop-or-mobile-app)
- [CLI or developer tool](#cli-or-developer-tool)
- [Data or ML pipeline](#data-or-ml-pipeline)
- [Infrastructure as code](#infrastructure-as-code)
- [Embedded or systems code](#embedded-or-systems-code)
- [Impact of a fix](#impact-of-a-fix)

## The profile

`profile.md`, written in Phase 0 before any opinion, read again at the start of every segment:

```text
Kinds:               a library published to a registry; its CLI
Languages, runtimes: TypeScript on Node 20 and 22; ESM and CommonJS builds
Delivery:            npm package; the CLI is its bin entry
Users and interface: developers, through the exported API and the CLI's flags and exit codes
Contract sources:    the README, the docs site, the doc comments, the CLI's --help, the guide's decided rules
Environments:        Node 20 to 22 on Linux, macOS, Windows (the CI matrix); a real run is the packed tarball
                     installed into a scratch project
Standards in force:  semantic versioning; the language's module rules; POSIX exit codes; the guide's lint rules
Risk order:          input validation at the API; concurrency of the cache; packaging; CLI exit codes; docs
Probe catalog:       values and types, text and encodings, concurrency and ordering, I/O and filesystems, packaging
Lenses:              design, tests, docs, configuration and operations; security (it reads user paths)
Impact scheme:       semver
Not shown by the repository, asked: whether Windows is supported or only tested
```

Each line comes from the repository where it can (manifests, CI, the guide, the docs); the user is asked only for what
it does not show. A line you guessed is marked as a guess. The standards line lists what the system uses or its
context calls for; a departure from one is asked about, not assumed to be a defect.

## Library or package

- **Contract sources:** the public entry points (what the package exports), the reference docs and doc comments, the
  types or interface files, the changelog and migration guides, the supported version ranges in the manifest.
- **Inventory adds:** every export, member, option and overload; the module formats and entry points the manifest
  declares; the published file list; peer and optional dependencies; the declared runtime floor.
- **Risk order:** input validation at the public boundary; state shared between calls (caches, singletons,
  registries); async ordering and cleanup; types against runtime; packaging (missing files, a module format that does
  not load); defaults that differ between entry points.
- **Where behavior lives:** the packed artifact installed into a scratch project, imported under every module system
  the package claims, on the runtime floor and the newest supported version. A build folder can hold files the
  published package leaves out, and the reverse. Types are probed with the compiler, as a consumer's code.
- **Impact:** semantic versioning, by the project's own rules if it states them.

## Web or HTTP service

- **Contract sources:** the API specification (OpenAPI, GraphQL schema, protobuf, AsyncAPI), the API docs, the error
  format, status codes, versioning and deprecation policy, rate limits, the runbook and service-level objectives.
- **Inventory adds:** every endpoint or operation with its methods, parameters, bodies, responses and errors;
  authentication and authorization per route; background jobs, queues and schedules; migrations; configuration and
  secrets; outbound calls and their timeouts and retries; health checks.
- **Risk order:** authorization on every route and its siblings; input validation and injection; data integrity under
  concurrent requests (lost updates, double processing, idempotency); partial failure of a dependency (timeouts,
  retries, circuit breaking); migrations and their rollback; resource limits (pagination, payload sizes, connections).
- **Where behavior lives:** the service started locally or in a container, with its real database engine and version
  in a scratch instance, called over its real protocol (an HTTP client, not the handler function). A dependency the
  review cannot run locally may be stubbed at the network edge; disclose it.
- **Impact:** what the fix changes for clients: a response shape, a status code, a header, an accepted input, an
  error code; whether it needs a new API version, a migration, or a coordinated deployment.

## Web front end

- **Contract sources:** the product's specifications and designs where the repository holds them, the component
  library's docs, the accessibility standard the project targets (often WCAG at a level), supported browsers, routes.
- **Inventory adds:** routes and their guards; forms and their validation (client and server); state stores and
  caches; what persists (cookies, storage, URLs); internationalization; the API calls each screen makes.
- **Risk order:** client validation that the server does not repeat; state that goes stale across navigation or tabs;
  race conditions between requests and user input; error and empty states; accessibility (names, focus, keyboard);
  behavior that differs between supported browsers; secrets or personal data in the bundle or in logs.
- **Where behavior lives:** the built app served as it ships, in every supported browser engine, at the viewport
  sizes the project supports; a real backend in a scratch environment, or recorded responses disclosed as a stand-in.
- **Impact:** user-visible change, and whether bookmarked URLs, stored data or an API contract change with it.

## Desktop or mobile app

- **Contract sources:** the platform's guidelines and permission model, the app's store listing and help, supported
  OS versions and devices, the update and data-migration policy.
- **Inventory adds:** permissions requested and used; local storage and its schema versions; background work and
  notifications; offline behavior; deep links; the update path from older versions.
- **Risk order:** data migration on update; lifecycle (backgrounding, process death, rotation, low memory); offline
  and flaky networks; permissions denied or revoked; locale, time zone and accessibility settings.
- **Where behavior lives:** a real device or the platform's official emulator at the supported OS versions; an
  upgrade from the previous release's build, not only a fresh install.
- **Impact:** user-visible change, data migration and its reversibility, the minimum OS version, store review risk.

## CLI or developer tool

- **Contract sources:** `--help` and the man page, the docs, exit codes, the output formats a script may parse,
  configuration files and environment variables, the supported shells and operating systems.
- **Inventory adds:** every command, flag, argument and its default; precedence between flags, environment and
  configuration files; output streams (what goes to stdout and stderr) and formats; exit codes; files it reads, writes
  and locks.
- **Risk order:** exit codes (a failure that exits 0); argument parsing at the edges; paths (spaces, Unicode,
  relative, symlinks, Windows separators); precedence of settings; machine-readable output stability; partial writes
  on interruption; signals.
- **Where behavior lives:** the installed binary or package as a user installs it, run from a shell on each supported
  OS, in a scratch directory.
- **Impact:** flags, output formats and exit codes are an interface: changing one breaks scripts. Semantic versioning
  if the tool is published that way.

## Data or ML pipeline

- **Contract sources:** schemas and data contracts, the pipeline's docs and lineage, data-quality checks, service
  levels for freshness, the model card and evaluation protocol for a model.
- **Inventory adds:** each stage with its inputs, outputs and schema; joins and their keys; deduplication and
  late-arriving data; backfills and reruns; randomness and seeds; training and serving feature code.
- **Risk order:** silent data loss or duplication (joins that drop rows, filters on nulls); schema drift; time zones
  and partition boundaries; idempotency of reruns; training and serving skew; leakage between training and evaluation
  data; numeric precision.
- **Where behavior lives:** the pipeline run on a small but realistic sample in a scratch location, with the real
  engine (the same SQL dialect, the same dataframe library version); a rerun of the same input to check idempotency.
- **Impact:** whether stored outputs must be recomputed or migrated, which consumers read the changed fields, and
  whether a model must be retrained or re-evaluated.

## Infrastructure as code

- **Contract sources:** the modules' inputs and outputs and their docs, the environments they describe, the
  organization's policies (tagging, encryption, network rules), the provider's documented behavior.
- **Inventory adds:** every module and its variables, defaults and outputs; state and its backend; secrets; network
  exposure; identities and their permissions; what a change replaces rather than updates.
- **Risk order:** changes that destroy and recreate stateful resources; permissions broader than needed; public
  exposure; secrets in state, variables or logs; drift between environments; provider version pinning.
- **Where behavior lives:** `plan` (or the tool's dry run) against a scratch account or a local emulator the user
  allows, and the provider's documentation; never `apply` against a shared environment.
- **Impact:** what a fix would replace or destroy when applied, downtime, and whether state must be moved.

## Embedded or systems code

- **Contract sources:** datasheets and protocol specifications, the hardware abstraction's docs, timing and memory
  budgets, the supported toolchains and targets, safety standards the domain names.
- **Inventory adds:** interrupts and their shared state; memory allocation and buffers; timing constraints; error and
  reset paths; the boot and update sequence.
- **Risk order:** undefined behavior and memory safety; races with interrupts and between threads; integer overflow
  and conversions; resource exhaustion; behavior on power loss during a write or an update.
- **Where behavior lives:** the target hardware or a cycle-accurate simulator the project uses, built with the
  supported toolchain and optimization levels; sanitizers and static analysis where the toolchain has them.
- **Impact:** binary and protocol compatibility, field-update risk, and certification the change touches.

## Impact of a fix

Judge each fix by the scheme the profile names, and use the project's own rules first when its guide states them.

- **Semantic versioning** (a published package): *patch* brings behavior in line with a stated contract or rejects
  input that never worked; *minor* adds a member, an option or an accepted input without breaking existing code;
  *major* makes code written against the current docs stop compiling, or behave differently in a way it could rely on.
- **Interface compatibility** (a service, a CLI, a file or data format): *compatible* (existing clients, scripts and
  stored data keep working), *needs a migration* (stored data, configuration or state must change, with or without
  downtime), or *breaking* (existing clients must change; name which).
- **Deployment risk** (a service, an app, infrastructure): what the fix changes when it rolls out (a restart, a
  replaced resource, a cache to clear, an order of deployment between services) and whether it can be rolled back.
- **None**: a fix to the docs alone.

Note when a fix you would suggest is breaking but a narrower one is not; that is often the useful finding.
