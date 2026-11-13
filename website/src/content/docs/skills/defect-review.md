---
title: defect-review
description: "A general skill: an agent reviews any kind of system for defects and reproduces every finding before it reports it."
---

## What it does

An honest, evidence-based defect review of any kind of system: a library, a service, a web, desktop or mobile app, a
CLI, a data pipeline, infrastructure code. It is not specific to POMWright. It finds defects, contradictions between
the code, types, tests, docs and configuration, design decisions whose cost it can show, and gaps in tests, docs and
operations. It reproduces every finding before it reports it, gives each its severity and the impact of its fix, and
changes nothing: the report is the product.

## When to use it

It starts only when you run it: `/defect-review` in Claude Code, `$defect-review` in Codex. A review takes one of
three scopes:

- the whole project: "a pre-release review of this repository";
- a change set: "review this branch", "what changed since v1.2", a pull request;
- one area: "review the invoice export", `src/auth/`.

When the request does not say which, it asks.

## How it works

1. **Orient and profile.** It reads the project's contributor guide, README and manifests, and writes a profile of the
   system before forming any opinion: what kind of system it is, its contracts, the environments it supports, the
   standards it follows, and its risks. The report states the profile.
2. **Map.** It lists everything in scope (interfaces, contracts, messages, configuration, docs, tests) and splits the
   list into segments ordered by risk. It asks who runs the segments (the agent one at a time, in parallel, or you, one
   session each) and whether to cap their cost.
3. **Review.** Each segment probes its contracts at their edges, in the environment the behavior lives in, and only in
   environments the reviewer controls, never production or shared systems.
4. **Report.** One Markdown file: the confirmed defects with their reproductions, documentation findings, what it could
   not confirm, design questions, and what it found sound.

## What was measured

Built while reviewing POMWright itself, first for POMWright and then made general. Measured with and without the skill
on four tasks, one run each, Claude Opus 5.5, each run in its own clone of the project under review.

<div class="measured">

| task | with the skill | without |
| --- | --- | --- |
| a whole small library (5 planted defects, a documentation error) | **10 of 10 checks** | 6 of 10 |
| a release's change set (POMWright 3.0.0 to 3.0.1) | **6 of 6** | 4 of 6 |
| one area (POMWright's session storage) | **6 of 7** | 3 of 7 |
| an unclear request | **3 of 3: asked for the scope** | 0 of 3: reviewed without asking |
| known defects reported with a reproduction | **7 of 8 (88%)** | 3 of 8 (38%) |
| checks passed, mean of the four | **96%** | 42% |

```mermaid
%%{init: {"themeVariables": {"xyChart": {"plotColorPalette": "#3b82f6, #f97316"}}}}%%
xychart-beta
  title "Share, %"
  x-axis ["known defects reported", "checks passed"]
  y-axis "%" 0 --> 100
  bar [88, 96]
  bar [38, 42]
```

</div>

Blue: with the skill. Orange: without it. Without the skill, the reviews saw most of the planted defects too, but
reported fewer with a reproduction, gave their findings no semver impact (4 of 4 reviews), wrote reproductions that do
not run as written (3 of 4) and left out the contract a defect breaks (2 of 4): what makes a report checkable.

- **Worth its time**: a review with the skill took 15% longer and cost 32% more, the work of reproducing every finding,
  for more than twice the known defects reported with a reproduction. On the unclear request it cost a third ($0.30
  against $0.93), since it asks before it reads.
- **In use**: its reviews found most of the defects fixed in POMWright 3.0.1 and 3.0.2, each with its reproduction, and
  caught release blockers before a merge, such as a dependency update that would have failed every publish.

<div class="measured">

| whole-project review of 3.0.2 | confirmed defects | documentation findings |
| --- | --- | --- |
| first | 30 (6 medium, 24 low) | 19 |
| second, after the fixes | 19 (3 medium, 16 low) | 37 |

</div>

Run it as the [index](/POMWright/skills/#using-them-well) recommends.

## Install and source

Install it as the [index](/POMWright/skills/#install) shows, on its own or with the POMWright skills. Source:
[`skills/defect-review`](https://github.com/DyHex/POMWright/tree/main/skills/defect-review).
