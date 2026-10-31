#!/usr/bin/env node
// Status of a segmented defect review run by subagents: per segment its findings, tokens, context, cost so far and
// projected, and progress (an estimate while it runs, the actual duration once done), plus the orchestrator and the
// totals.
//
//   node review-status.mjs <state.json>               prints the table (Markdown)
//   node review-status.mjs <state.json> --check-caps  prints only cap alerts; exit 3 when a cap needs action
//
// It reads only the usage records, timestamps, tool-call counts and compaction markers of the transcripts (Claude Code
// writes one JSON line per content block, so a call's usage repeats and is deduplicated by message id). It never prints
// content.
//
// The context of a call is what it sent: its input, cache-read and cache-write tokens. The table gives a running
// segment's context now (its last call) and its peak, and a finished segment's peak, against the window when the state
// file names one, with the number of compactions (Claude Code's "compact_boundary" lines, automatic or manual).
//
// state.json, kept by the orchestrator:
// {
//   "prices": { "input": 4, "output": 20, "cacheRead": 0.2, "cacheWrite5m": 5, "cacheWrite1h": 8 },  // $ per MTok
//   "contextWindow": 1000000,              // optional: the model's context window in tokens
//   "priorMinutes": 60,                    // expected duration of a size-1 segment before any segment is done
//   "caps": { "total": null, "perSegment": null, "wrapUpAt": 0.9 },  // dollars, or null for no cap
//   "orchestration": "/path/to/orchestrator.jsonl",                   // optional
//   "segments": [
//     { "id": "1", "name": "Session storage", "size": 1.0, "status": "running",   // pending|running|done|partial
//       "transcript": "/path/to/agent-<id>.jsonl", "results": "/path/to/segment-1.md or a folder", "cap": null,
//       "until": "2026-01-01T12:00:00Z" }                     // optional: where the row ends when the agent is resumed
//   ],
//   "extra": [ { "name": "a stopped attempt", "transcript": "/path.jsonl",                // optional, counted in totals
//                "from": "2026-01-01T12:00:00Z", "until": null, "status": "done" } ]   // range and status optional
// }
//
// Progress of a running segment: elapsed time against its expected duration (size x the mean minutes per size unit
// of the finished segments, or priorMinutes before any). Past 80 % of that duration the estimate rises ever more slowly
// toward 95 % (a segment that runs long is not almost done), and the row says it is past its estimate. Projected
// cost of a running segment: its per-call cost fitted as a line over the call index (each call re-reads a context
// that grows), summed to the projected number of calls, and blended with the prior (size x the mean dollars per size
// unit of the finished segments) by progress. Pending segments use the prior. The first estimates are rough; every finished segment
// recalibrates the rest.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const [stateFile, mode] = process.argv.slice(2);
if (!stateFile) {
	console.error("usage: review-status.mjs <state.json> [--check-caps]");
	process.exit(2);
}
const state = JSON.parse(readFileSync(stateFile, "utf8"));
const P = state.prices;

// `from` and `until` (ISO timestamps, optional) limit the lines read: a segment resumed later for a follow-up keeps
// its row up to `until`, and the follow-up is an `extra` row from `from`, so the follow-up does not skew calibration.
function readTranscript(file, from, until) {
	const t = {
		costs: [],
		tokens: 0,
		usd: 0,
		first: undefined,
		last: undefined,
		toolCalls: 0,
		context: 0,
		peakContext: 0,
		compactions: 0,
	};
	if (!file || !existsSync(file)) return t;
	const seen = new Set();
	for (const line of readFileSync(file, "utf8").split("\n")) {
		if (!line) continue;
		let o;
		try {
			o = JSON.parse(line);
		} catch {
			continue;
		}
		if ((from && (o.timestamp ?? "") < from) || (until && (o.timestamp ?? "") > until)) continue;
		if (o.timestamp) {
			t.first ??= o.timestamp;
			t.last = o.timestamp;
		}
		if (o.type === "system" && o.subtype === "compact_boundary") t.compactions++;
		const m = o.message;
		if (o.type !== "assistant" || !m) continue;
		for (const b of Array.isArray(m.content) ? m.content : []) if (b.type === "tool_use") t.toolCalls++;
		const id = m.id ?? o.requestId ?? o.uuid;
		if (!m.usage || seen.has(id)) continue;
		seen.add(id);
		const u = m.usage;
		const w1h = u.cache_creation?.ephemeral_1h_input_tokens ?? 0;
		const w5m = u.cache_creation?.ephemeral_5m_input_tokens ?? (u.cache_creation_input_tokens ?? 0) - w1h;
		const input = u.input_tokens ?? 0;
		const output = u.output_tokens ?? 0;
		const read = u.cache_read_input_tokens ?? 0;
		const speed = u.speed === "fast" ? 2 : 1;
		const usd =
			(speed *
				(input * P.input + output * P.output + read * P.cacheRead + w5m * P.cacheWrite5m + w1h * P.cacheWrite1h)) /
			1e6;
		t.costs.push(usd);
		t.usd += usd;
		t.tokens += input + output + read + w5m + w1h;
		t.context = input + read + w5m + w1h;
		t.peakContext = Math.max(t.peakContext, t.context);
	}
	t.minutes = t.first ? (Date.parse(t.last) - Date.parse(t.first)) / 60000 : 0;
	return t;
}

// Cumulative cost if the calls go on to `total`, from a least-squares line through the per-call costs.
function extrapolate(costs, fraction) {
	const n = costs.length;
	if (n < 10) return undefined;
	const mx = (n + 1) / 2;
	const my = costs.reduce((s, c) => s + c, 0) / n;
	let sxy = 0;
	let sxx = 0;
	costs.forEach((c, i) => {
		sxy += (i + 1 - mx) * (c - my);
		sxx += (i + 1 - mx) ** 2;
	});
	const slope = Math.max(0, sxy / sxx);
	const intercept = my - slope * mx;
	const total = Math.max(n, Math.round(n / Math.min(0.95, Math.max(fraction, 0.05))));
	const tri = (k) => (k * (k + 1)) / 2;
	return n * my + (total - n) * intercept + slope * (tri(total) - tri(n));
}

const KINDS = [
	["defect", /^confirmed defects/i],
	["docs", /^documentation findings/i],
	["suspected", /^suspected/i],
	["design", /^design questions/i],
];

// Findings so far: a folder of one file per finding (a "**Kind**: ..." line each), or one report-format file whose
// sections are counted by their "### " entries, "- **ID**" bullets, or top-level bullets.
function findings(results) {
	const n = { defect: 0, docs: 0, suspected: 0, design: 0 };
	if (!results || !existsSync(results)) return undefined;
	if (statSync(results).isDirectory()) {
		for (const f of readdirSync(results).filter((f) => f.endsWith(".md"))) {
			const kind = /\*\*Kind\*\*:\s*([a-z]+)/i.exec(readFileSync(join(results, f), "utf8"))?.[1]?.toLowerCase();
			if (kind === "documentation") n.docs++;
			else if (kind && kind in n) n[kind]++;
		}
		return n;
	}
	let section;
	const entries = {};
	for (const line of readFileSync(results, "utf8").split("\n")) {
		const heading = /^#{1,2}\s+(?:\d+\.\s*)?(.+)$/.exec(line);
		if (heading) {
			section = KINDS.find(([, re]) => re.test(heading[1]))?.[0];
			if (section) entries[section] = { h3: 0, id: 0, bullet: 0 };
			continue;
		}
		if (!section) continue;
		if (/^###\s/.test(line)) entries[section].h3++;
		else if (/^-\s+\*\*ID\*\*/.test(line)) entries[section].id++;
		else if (/^-\s+\S/.test(line)) entries[section].bullet++;
	}
	for (const [kind, e] of Object.entries(entries)) n[kind] = e.h3 || e.id || e.bullet;
	return n;
}

const money = (x) => `$${x.toFixed(2)}`;
const mtok = (x) => `${(x / 1e6).toFixed(1)}M`;
const ktok = (x) => (x >= 1e6 ? `${(x / 1e6).toFixed(2)}M` : `${Math.round(x / 1e3)}k`);
// A segment's context: now and peak while it runs, the peak once it is done, and its compactions.
function contextText(t, running) {
	if (!t.peakContext) return "—";
	const window = state.contextWindow ? ` of ${ktok(state.contextWindow)}` : "";
	const share = state.contextWindow ? ` (${Math.round((100 * t.peakContext) / state.contextWindow)}%)` : "";
	const compacted = `${t.compactions} compaction${t.compactions === 1 ? "" : "s"}`;
	return running
		? `${ktok(t.context)} now, peak ${ktok(t.peakContext)}${window}${share}; ${compacted}`
		: `peak ${ktok(t.peakContext)}${window}${share}; ${compacted}`;
}
const segs = state.segments.map((s) => ({ ...s, t: readTranscript(s.transcript, undefined, s.until) }));
const finished = segs.filter((s) => s.status === "done" && s.t.costs.length);
const mean = (f) => (finished.length ? finished.reduce((a, s) => a + f(s), 0) / finished.length : undefined);
const minutesPerUnit = mean((s) => s.t.minutes / s.size) ?? state.priorMinutes ?? 60;
let usdPerUnit = mean((s) => s.t.usd / s.size);

// running segments first: before any segment is done, their projections are the prior for the pending ones
for (const s of segs.filter((s) => s.status === "running")) {
	s.expected = minutesPerUnit * s.size;
	const ratio = s.t.minutes / s.expected;
	s.fraction = ratio <= 0.8 ? ratio : 0.8 + 0.15 * (1 - 0.8 / ratio);
	const fit = extrapolate(s.t.costs, s.fraction);
	const prior = usdPerUnit === undefined ? undefined : usdPerUnit * s.size;
	s.projected =
		fit !== undefined && prior !== undefined ? s.fraction * fit + (1 - s.fraction) * prior : (fit ?? prior ?? s.t.usd);
}
const running = segs.filter((s) => s.status === "running");
usdPerUnit ??= running.length ? running.reduce((a, s) => a + s.projected / s.size, 0) / running.length : undefined;

const caps = state.caps ?? {};
const wrapUpAt = caps.wrapUpAt ?? 0.9;
const alerts = [];
const extras = (state.extra ?? []).map((e) => ({
	name: e.name,
	status: e.status,
	t: readTranscript(e.transcript, e.from, e.until),
}));
const orchestration = state.orchestration ? readTranscript(state.orchestration) : undefined;
let spent = extras.reduce((a, e) => a + e.t.usd, 0) + (orchestration?.usd ?? 0);
let projectedTotal = spent;
let tokens = extras.reduce((a, e) => a + e.t.tokens, 0) + (orchestration?.tokens ?? 0);

const rows = [];
for (const s of segs) {
	const f = findings(s.results);
	const found = f ? `${f.defect} defects, ${f.docs} docs, ${f.suspected} suspected, ${f.design} design` : "—";
	const cap = s.cap ?? caps.perSegment ?? undefined;
	const capText = cap ? ` (cap ${money(cap)})` : "";
	spent += s.t.usd;
	tokens += s.t.tokens;
	if (s.status === "done" || s.status === "partial") {
		projectedTotal += s.t.usd;
		const how = s.status === "partial" ? "partial, stopped at its cap," : "done";
		rows.push([
			s.id,
			s.name,
			found,
			mtok(s.t.tokens),
			contextText(s.t, false),
			money(s.t.usd) + capText,
			`${how} in ${Math.round(s.t.minutes)} min`,
		]);
	} else if (s.status === "running") {
		projectedTotal += s.projected;
		const pct = Math.round(s.fraction * 100);
		rows.push([
			s.id,
			s.name,
			`${found} so far`,
			mtok(s.t.tokens),
			contextText(s.t, true),
			`${money(s.t.usd)} so far, ~${money(s.projected)} projected${capText}`,
			`~${pct}% (${Math.round(s.t.minutes)} of ~${Math.round(s.expected)} min${s.t.minutes > s.expected ? ", past its estimate" : ""}, ${s.t.toolCalls} tool calls)`,
		]);
		if (cap && s.t.usd >= wrapUpAt * cap)
			alerts.push(`segment ${s.id} has spent ${money(s.t.usd)} of its ${money(cap)} cap`);
		else if (cap && s.projected > cap)
			alerts.push(`segment ${s.id} is projected at ${money(s.projected)}, over its ${money(cap)} cap`);
	} else {
		const expected = minutesPerUnit * s.size;
		const prior = usdPerUnit === undefined ? undefined : usdPerUnit * s.size;
		projectedTotal += prior ?? 0;
		rows.push([
			s.id,
			s.name,
			"—",
			"—",
			"—",
			(prior === undefined ? "—" : `~${money(prior)} projected`) + capText,
			`not started (~${Math.round(expected)} min)`,
		]);
	}
}
for (const e of extras)
	rows.push([
		"—",
		e.name,
		"—",
		mtok(e.t.tokens),
		contextText(e.t, e.status === "running"),
		money(e.t.usd),
		e.status === "running" ? "running" : `${e.status ?? "stopped"} in ${Math.round(e.t.minutes)} min`,
	]);
if (orchestration)
	rows.push([
		"—",
		"Orchestration (this session)",
		"—",
		mtok(orchestration.tokens),
		contextText(orchestration, true),
		money(orchestration.usd),
		"ongoing",
	]);
if (caps.total && spent >= wrapUpAt * caps.total)
	alerts.push(`the review has spent ${money(spent)} of its ${money(caps.total)} total cap`);
else if (caps.total && projectedTotal > caps.total)
	alerts.push(`the review is projected at ${money(projectedTotal)}, over its ${money(caps.total)} total cap`);

if (mode === "--check-caps") {
	for (const a of alerts) console.log(a);
	process.exit(alerts.some((a) => / has spent /.test(a)) ? 3 : 0);
}
console.log("| Segment | Area | Findings | Tokens | Context | Cost | Progress / time |");
console.log("| --- | --- | --- | --- | --- | --- | --- |");
for (const r of rows) console.log(`| ${r.join(" | ")} |`);
const totalCap = caps.total ? ` (cap ${money(caps.total)})` : "";
console.log(
	`| | **Total** | | **${mtok(tokens)}** | | **${money(spent)} so far, ~${money(projectedTotal)} projected**${totalCap} | |`,
);
if (alerts.length) console.log(`\nCaps: ${alerts.join("; ")}.`);
console.log(
	`\nEstimates: ${finished.length} of ${segs.length} segments finished; ${finished.length ? "calibrated on them" : "uncalibrated, so rough"}.`,
);
