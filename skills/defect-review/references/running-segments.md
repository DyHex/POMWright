# Running the segments

Who runs the segments of a review, how the user follows their progress and cost, and how cost caps are kept. The
status table works from what the agent's harness records; Claude Code's specifics are in their own section.

- [Who runs them](#who-runs-them)
- [Briefing a segment](#briefing-a-segment)
- [The status table](#the-status-table)
- [Cost caps](#cost-caps)
- [In Claude Code](#in-claude-code)
- [In other agents](#in-other-agents)

## Who runs them

Once the segment plan is written, ask the user two things, with the plan in front of them.

**Who runs the segments.** Offer the options that fit:

- **You, one at a time**: the default whenever segments share a resource (a fixed port, a test server, a build output,
  a database, one checkout).
- **You, in parallel**: only when the segments share nothing, for example each in its own worktree with its own port.
  It is faster, and costs about the same in total.
- **The user, one session per segment**: write a brief per segment and give the user the command and the prompt that
  start each session.

**Whether to cap the cost**: no cap, a cap per segment, a cap on the whole review, or both. Caps are in dollars at the
model's list prices: look the prices up, do not recall them, and say that the figures are API-equivalent and are not
what a subscription bills.

## Briefing a segment

Each segment starts with a fresh context. Its brief holds: the ground rules (SKILL.md's, in full), the profile, its
inventory lines, the probing notes from Phase 0, where to write its findings (`segment-<n>.md`), and these
instructions:

- use the same model and effort as the session that started it, unless the user asked for others;
- start no agents of its own;
- write findings to its file as it goes, in the report's format;
- leave a shared checkout as it found it, and stop every process it started;
- end with its counts per kind of finding and one line per finding.

Between segments, check that a shared checkout is clean before starting the next.

## The status table

Keep the user informed with one table. Show it after every segment finishes and whenever the user asks for a status.
One row per segment:

- the segment and its area;
- the findings per kind, marked *so far* while the segment runs;
- the tokens spent;
- the context: its size now and its peak while it runs, the peak once it is done, against the model's window, and how
  many times it was compacted (a segment that compacted has lost detail it read; say so when you report it);
- the cost so far, and the projected cost while it runs;
- the progress: an estimate while it runs, the actual duration once it is done.

Add a row for your own session and a total. Say plainly that the first estimates are rough and improve as segments
finish.

- **Spend.** Read it from what the harness records, never from an agent's own report.
- **Progress.** Compare a segment's elapsed time with its expected duration: its size factor (from the plan) times the
  mean minutes per size unit of the finished segments. Before any segment has finished, use a guess.
- **Projection.** Each call re-reads a context that grows, so a segment's cost per call rises. Fit it as a line over
  the call index and extend it to the projected number of calls. Blend that with the prior (the size factor times the
  mean dollars per size unit of the finished segments), giving the fit more weight as the segment advances. A segment
  not yet started uses the prior. Every finished segment recalibrates the rest.

## Cost caps

- Before starting a segment, compare its projected cost with what is left of the total cap. If it does not fit, ask the
  user whether to raise the cap, narrow the segment or skip it. Never start it silently.
- While a segment with a cap runs, keep a background check that wakes you when it reaches 90 % of its cap or the review
  reaches 90 % of the total.
- When a check fires, stop the segment, then resume it with one instruction: stop probing, write the coverage and the
  findings it has, and end. That keeps its work and costs a few calls. A segment that cannot be resumed is recorded as
  *partial*, with the inventory lines it did not reach, in the coverage section.
- A cap is approximate: spend is measured between calls, so the last call can overshoot. A cap below a segment's
  projected cost will end it partial; say so when the user sets one.

## In Claude Code

- **Transcripts.** Each subagent's transcript is
  `~/.claude/projects/<project>/<session-id>/subagents/agent-<agent-id>.jsonl`; the launch result gives the agent's ID.
  Your own transcript is `<session-id>.jsonl` beside that folder. Each line holds a content block, and a call's usage
  repeats on each of its blocks, so count it once per message ID. Never read a transcript into your context: sum it
  with a script.
- **The script.** `scripts/review-status.mjs` in this skill's folder implements the table, the projections and the cap
  check from a small state file you keep current (the segments, their size factors, status, transcripts and result
  paths, the prices and the caps); its header documents the state file:

  ```sh
  node scripts/review-status.mjs notes/state.json               # the table, in Markdown
  node scripts/review-status.mjs notes/state.json --check-caps  # exit 3 when a cap needs action
  ```

- **The background check.** A background shell command such as
  `while node scripts/review-status.mjs notes/state.json --check-caps; do sleep 90; done` ends when the check exits
  with 3, which wakes you.

## In other agents

Use what the harness reports: a per-session usage or cost figure, a token count, or a log of calls. Build the same
table from it, with the columns it can fill, and say which it cannot. When the harness reports nothing about spend,
report progress and findings only, and say that cost is not measured.
