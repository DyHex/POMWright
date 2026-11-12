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

## What we measured

POMWright's own releases were reviewed with it: the reviews behind 3.0.1 and 3.0.2 ran with its earlier, POMWright
version. The two whole-project reviews of 3.0.2 found:

| | first review | second review, after the fixes |
| --- | --- | --- |
| confirmed defects | 30 (6 Medium, 24 Low) | 19 (3 Medium, 16 Low) |
| documentation findings | 19 | 37 |
| the first review's 61 findings, by then | | 54 fixed, 5 in part, 2 kept as decided |

Every finding came with its reproduction (the command, its exit code, the output). They also caught release problems
before a merge: a dependency update that would have failed every publish, and changesets claiming fixes that did not
fully hold. It was not compared with an agent reviewing without it, and the general version on this page has not been
measured since its rewrite. Run it as the [index](/POMWright/skills/#using-them-well) recommends.

## Install and source

Install it as the [index](/POMWright/skills/#install) shows, on its own or with the POMWright skills. Source:
[`skills/defect-review`](https://github.com/DyHex/POMWright/tree/main/skills/defect-review).
