# Probe catalog

Classes of boundary and failure to try, by domain, each with what to try and how to reproduce it. The profile selects
the sections that apply; an item that suggests a class not listed gets it too. Try a class where the contract or the
code makes it plausible, not everywhere: a probe without a reason to suspect the path is noise.

- [How to use it](#how-to-use-it)
- [Values and types](#values-and-types)
- [Text and encodings](#text-and-encodings)
- [Numbers](#numbers)
- [Time and time zones](#time-and-time-zones)
- [Collections](#collections)
- [Identity and equality](#identity-and-equality)
- [State and lifecycle](#state-and-lifecycle)
- [Concurrency and ordering](#concurrency-and-ordering)
- [I/O and filesystems](#io-and-filesystems)
- [Networks and partial failure](#networks-and-partial-failure)
- [Persistence and migrations](#persistence-and-migrations)
- [Configuration and environment](#configuration-and-environment)
- [Packaging and distribution](#packaging-and-distribution)
- [User interfaces and accessibility](#user-interfaces-and-accessibility)
- [Language and platform notes](#language-and-platform-notes)

## How to use it

- Start from the contract: what the item promises, and for which inputs. Each class below is a way the promise can
  fail at its edges.
- Reproduce through the public interface, minimal, in the real environment (SKILL.md's ground rules). Record the
  command, the exit code and the output.
- A class that holds is a line in *What is sound*, naming what you tried.

## Values and types

- Absent values: empty, null, undefined, missing keys, empty collections, a default left out.
- Values of the wrong type from an untyped caller (a script, JSON, a form, an environment variable): a number as a
  string, a boolean as `"false"`, an object where a list is expected.
- Objects with unusual shapes: class instances rather than plain records, objects with a prototype or inherited keys,
  frozen or read-only objects, objects with getters that throw.
- Inputs the caller mutates after passing them, and outputs the caller mutates after receiving them: does the system
  keep its own copy where its contract implies one?
- Declared types or schemas against runtime checks: an input the types allow and the runtime rejects, and the reverse.

## Text and encodings

- Unicode beyond ASCII: combining marks, right-to-left text, emoji and characters outside the basic plane, characters
  that look alike, normalization forms (a precomposed letter against a letter with a combining mark).
- Whitespace and control characters: leading and trailing spaces, tabs, line breaks of each style, a no-break space,
  a zero-width character, a byte-order mark, NUL.
- Very long values, and values at the length limits the contract or the storage sets (counted in bytes, code units or
  characters: which?).
- Values that normalize or are parsed: URLs (case, encoding, credentials, empty query or fragment, backslashes),
  paths, email addresses, case folding, number and date formats by locale.
- Escaping across a boundary: quotes, backslashes, delimiters and template syntax in values that reach a query, a
  shell, a file format, a log line or a page.

## Numbers

- Zero, negative values, the largest and smallest representable values, one past a limit.
- Non-integers where integers are expected, rounding direction, floating-point precision in money or comparisons.
- Overflow and conversion between sizes and signedness; division by zero; NaN and infinities where the language has
  them.
- Units: seconds against milliseconds, bytes against kilobytes, percentages as fractions.

## Time and time zones

- Daylight-saving transitions (a local time that occurs twice or never), time zones with offsets that are not whole
  hours, a server and a client in different zones.
- Boundaries: midnight, month ends, leap days and leap years, the turn of a year, week numbering.
- Clock behavior: a clock that moves backwards, monotonic against wall-clock time, timeouts that span a suspend.
- Serialization: time zone dropped or assumed on parse, precision lost (milliseconds, nanoseconds), epoch units.

## Collections

- Empty, one element, many; duplicates; elements in an unexpected order.
- Pagination and limits: the last page, a page past the end, items added or removed between pages.
- Iteration while the collection changes; ordering promised but not enforced (a map or set iterated in insertion
  order, or not).
- Keys that collide after normalization (case, Unicode, trimming).

## Identity and equality

- Two values equal by content and different by identity, and the reverse; a cache or a set keyed by the wrong one.
- Equality across types (a number and its string), across encodings, across normalization.
- Identifiers reused after deletion; identifiers predictable where the contract implies they are not.

## State and lifecycle

- Calls in an unexpected order: before initialization, after shutdown, twice, a step skipped.
- An initializer or constructor that fails partway: is the half-built state visible or used later?
- Objects returned earlier, used after later calls changed the state underneath (a closed connection, a disposed
  handle, a navigation, an expired session).
- Cleanup on every path: success, error, cancellation, timeout; resources released once and only once.
- Methods called detached from their object, or with a different receiver, where the language allows it.

## Concurrency and ordering

- Overlapping calls to one operation; calls that are not awaited; calls batched together; the same request sent twice
  (idempotency).
- Check-then-act sequences (read, decide, write) with another writer between; lost updates; counters and sequences.
- Ordering promised across asynchronous steps, events, queues or retries; messages delivered twice or out of order.
- Cancellation and timeouts in the middle of a multi-step operation: what is left behind?
- A race shows only with real parallelism and enough rounds: run it with several workers and repeat it, and say how
  many rounds failed out of how many.

## I/O and filesystems

- Paths: spaces, Unicode, very long paths, relative paths and the working directory, symbolic links, case-insensitive
  filesystems, the other platform's separators, reserved names.
- Files: missing, empty, unreadable, a directory where a file is expected, being written by another process, larger
  than memory.
- Writes interrupted partway (kill the process): is the old content preserved or the new one complete?
- Temporary files and locks: cleaned up, unique per process, safe from another user on a shared machine.

## Networks and partial failure

- A dependency that is slow, refuses connections, resets mid-response, returns an error status, returns a malformed or
  truncated body, or succeeds after the client gave up.
- Timeouts: set at all, and shorter than the caller's; retries bounded, spaced, and safe for operations that are not
  idempotent.
- Redirects, proxies, TLS errors: followed, refused or reported as the contract says, never silently bypassed.
- Probe these against a local stand-in server you start (a stand-in: disclose it), never by disturbing a shared one.

## Persistence and migrations

- Migrations forward and back on a copy of realistic data; a migration rerun after a partial failure.
- Constraints the database enforces against those only the code enforces: what a second writer can bypass.
- Transactions: isolation level against the contract's assumptions; work done outside the transaction it depends on.
- Old data read by new code, and new data read by the old code during a rolling deployment.

## Configuration and environment

- Each setting at its default, its documented extremes, and unset; precedence between sources (flags, environment,
  files, remote configuration).
- Settings that are documented but unused, used but undocumented, or named differently in two places.
- Secrets: read from where the docs say, never logged, never in error messages or the repository.
- Locale, time zone, file encoding and line endings of the machine the system runs on.

## Packaging and distribution

- The artifact as users receive it (a package from the registry's tarball, an image, an installer), not the build
  folder: files missing from it or included by mistake.
- Every entry point and module format it declares, loaded in a scratch consumer; the declared runtime and dependency
  ranges at their floor.
- Reproducibility: the lockfile against the manifest; a build that depends on the build machine's state.
- What CI tests against what ships: the same commit, the same artifact, the same versions.

## User interfaces and accessibility

- Every state of a screen: loading, empty, error, partial data, a very long value, a slow response, a double submit.
- Navigation: back and forward, reload, deep links, a second tab, a session that expired.
- Input: keyboard only, paste, autofill, input methods for other scripts, validation on the client against the server.
- Accessibility: names and roles of controls, focus order and visibility, contrast, announcements of changes, zoom and
  reduced motion, against the standard the project targets.
- Supported browsers or devices: each engine, the smallest and largest supported sizes.

## Language and platform notes

Classes that recur in some languages and platforms, to add where the profile names them:

- **JavaScript and TypeScript:** prototype keys as data keys (`__proto__`, `constructor`); a regular expression with
  the `g` or `y` flag keeping `lastIndex` between calls; `Promise.all` failing fast while other work continues;
  `this` lost when a method is passed as a callback; numbers above 2^53; types erased at runtime.
- **Python:** mutable default arguments; naive and aware datetimes mixed; integer and float division; iteration over a
  dict changed meanwhile; exceptions swallowed by a broad `except`.
- **Go:** nil maps and nil interfaces holding a nil pointer; goroutines leaked by an unread channel; loop variables
  captured; errors ignored with `_`.
- **Java and the JVM:** `equals` without `hashCode`; boxed numbers compared by identity; checked exceptions wrapped and
  lost; thread safety of shared formatters and collections.
- **C and C++:** undefined behavior (signed overflow, out-of-bounds access, use after free); integer promotion; strings
  without a terminator; run probes under the sanitizers the toolchain offers.
- **Rust:** `unwrap` on input-derived values; integer overflow, which panics in debug builds and wraps in release
  builds; `unsafe` blocks and the invariants they assume.
- **SQL:** `NULL` in comparisons and `NOT IN`; implicit casts; collation and case; time zone of timestamp types.
- **Shell:** unquoted variables, word splitting and globbing; `set -e` exceptions; exit codes lost in a pipe.
