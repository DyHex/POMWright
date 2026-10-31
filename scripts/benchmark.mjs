// Measures what POMWright's calls cost against the installed package, beside the same work done with Playwright
// alone, and prints the tables of website/src/content/docs/internal/performance.md.
//
//   pnpm bench                          # after `pnpm harness:install`: every section
//   pnpm bench registry fixture         # some sections: registry, fixture, storage
//   taskset -c 0-3 pnpm bench           # the reference run on the maintainer's machine: its fastest cores only
//   POMWRIGHT_BENCH_BASELINE=<dir> pnpm bench storage   # also set, get and clear of another build (an extracted package)
//   POMWRIGHT_BENCH_RUNS=1 pnpm bench storage           # one run instead of five, to try a change quickly
//
// Each section runs five times in fresh processes, and every cell prints the median and the range of the five: a
// process's compiled code, its heap and the cores it lands on differ from one run to the next, more than the samples
// inside one run do. The numbers depend on the machine, so the output starts with it: the CPU, the CPUs this process
// may use and the load average when it started. They are taken at rest, on one worker with nothing else running: a
// declared condition, not what a loaded test run sees; the storage section also runs under the harness's parallel
// workers.
//
// registry: four kinds of path, short (3 segments) and long (12), each with plain definitions or with one filter step
// per definition, every segment registered, so a chain has one Playwright locator per segment; resolved per call
// beside the same chain built with Playwright's locator methods, registered at sizes from about 100 to 1,000,000 paths,
// and one count() round trip to the browser, for scale. Locator methods build objects in Node and talk to no browser,
// so a real chromium page is only the target they are built on. fixture: test/benchmarks/pageObjectFixture.spec.ts.
// storage: test/benchmarks/sessionStorage.spec.ts, on three browsers.

import { execFileSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(path.join(root, "package.json"));
const RUNS = Number(process.env.POMWRIGHT_BENCH_RUNS ?? 5);
const SECTIONS = ["registry", "fixture", "storage"];

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

// ---- the registry section, one run in a process of its own (`--registry-run <out file>`) ----

const KINDS = [
	{ name: "short, plain", segments: 3, steps: false },
	{ name: "short, a step per segment", segments: 3, steps: true },
	{ name: "long, plain", segments: 12, steps: false },
	{ name: "long, a step per segment", segments: 12, steps: true },
];

/** The segments of one chain: a `main` landmark, then sections, then a button, each with Playwright's arguments. */
function segmentsOf(prefix, kind) {
	const segments = [{ part: `${prefix}main`, method: "locator", args: ["main"] }];
	for (let i = 1; i < kind.segments - 1; i++) {
		segments.push({ part: `section@s${i}`, method: "getByRole", args: ["region", { name: `Section ${i}` }] });
	}
	segments.push({ part: "button@save", method: "getByRole", args: ["button", { name: "Save" }] });
	let current = "";
	return segments.map((segment) => {
		current = current ? `${current}.${segment.part}` : segment.part;
		return { ...segment, path: current, filter: kind.steps ? { hasText: segment.part } : undefined };
	});
}

function register(registry, segments) {
	for (const segment of segments) {
		const registration = registry.add(segment.path)[segment.method](...segment.args);
		if (segment.filter) registration.filter(segment.filter);
	}
}

/** The same chain written with Playwright's locator methods, called through the segments' data as the registry is. */
function playwrightChain(page, segments) {
	let target = page;
	for (const segment of segments) {
		target = target[segment.method](...segment.args);
		if (segment.filter) target = target.filter(segment.filter);
	}
	return target;
}

async function registryRun(outFile) {
	const { chromium } = require("@playwright/test");
	const { createRegistryWithAccessors, PageObject } = require(path.join(root, ".pack/pomwright/dist/index.js"));
	// every result is kept here, so the engine cannot drop the work it measures
	let sink;
	const collect = () => globalThis.gc?.();

	/** Microseconds per call of `fn`, the median of `runs` runs of `calls` calls, after a warm-up run of as many. */
	const perCall = (fn, calls, runs = 7) => {
		for (let i = 0; i < calls; i++) sink = fn(i);
		const times = [];
		for (let run = 0; run < runs; run++) {
			collect();
			const start = process.hrtime.bigint();
			for (let i = 0; i < calls; i++) sink = fn(i);
			times.push(Number(process.hrtime.bigint() - start) / 1e3 / calls);
		}
		return median(times);
	};
	/** As `perCall`, each call on an input `prepare` builds before the run starts, outside the timer. */
	const perPreparedCall = (prepare, fn, calls, runs = 7) => {
		let next = 0;
		const batch = () => Array.from({ length: calls }, () => prepare(next++));
		for (const input of batch()) sink = fn(input);
		const times = [];
		for (let run = 0; run < runs; run++) {
			const inputs = batch();
			collect();
			const start = process.hrtime.bigint();
			for (const input of inputs) sink = fn(input);
			times.push(Number(process.hrtime.bigint() - start) / 1e3 / calls);
		}
		return median(times);
	};
	const timeMs = (fn) => {
		const start = process.hrtime.bigint();
		sink = fn();
		return Number(process.hrtime.bigint() - start) / 1e6;
	};
	const heapMb = () => {
		collect();
		return process.memoryUsage().heapUsed / 1024 / 1024;
	};

	const browser = await chromium.launch();
	const page = await browser.newPage();

	// per call, one chain of each kind; every kind's calls run once before any is measured, so no kind is measured on
	// code compiled for fewer kinds than the others
	const setups = KINDS.map((kind) => {
		const segments = segmentsOf("", kind);
		const { registry } = createRegistryWithAccessors(page);
		register(registry, segments);
		registry.verify();
		return { kind, segments, terminal: segments.at(-1).path, registry };
	});
	const registration = ({ kind }) => ({
		prepare: (i) => ({ registry: createRegistryWithAccessors(page).registry, segments: segmentsOf(`r${i}`, kind) }),
		run: (input) => register(input.registry, input.segments),
	});
	for (const setup of setups) {
		const { prepare, run } = registration(setup);
		for (let i = 0; i < 2_000; i++) run(prepare(`w${i}`));
		for (let i = 0; i < 20_000; i++) {
			sink = playwrightChain(page, setup.segments);
			sink = setup.registry.getNestedLocator(setup.terminal);
			sink = setup.registry.getLocator(setup.terminal);
			sink = setup.registry.getLocatorSchema(setup.terminal).getNestedLocator();
		}
	}
	const perKind = setups.map((setup) => {
		const { kind, segments, terminal, registry } = setup;
		const { prepare, run } = registration(setup);
		return {
			kind: kind.name,
			segments: kind.segments,
			registerPerPath: perPreparedCall(prepare, run, 2_000) / kind.segments,
			playwright: perCall(() => playwrightChain(page, segments), 20_000),
			getNestedLocator: perCall(() => registry.getNestedLocator(terminal), 20_000),
			getLocator: perCall(() => registry.getLocator(terminal), 20_000),
			query: perCall(() => registry.getLocatorSchema(terminal).getNestedLocator(), 20_000),
		};
	});
	const registryCreation = perCall(() => createRegistryWithAccessors(page).registry, 2_000);

	// scaling: a registry of a mix of the four kinds, registered, verified, and defined through a page object
	const scaling = [];
	for (const size of [100, 1_000, 10_000, 100_000, 1_000_000]) {
		const chains = [];
		let paths = 0;
		for (let i = 0; paths < size; i++) {
			const segments = segmentsOf(`c${i}`, KINDS[i % KINDS.length]);
			chains.push(segments);
			paths += segments.length;
		}
		const runs = size <= 10_000 ? 5 : 1;
		const register_ = [];
		const verify = [];
		const define = [];
		const heap = [];
		for (let run = 0; run < runs; run++) {
			const before = heapMb();
			const { registry } = createRegistryWithAccessors(page);
			register_.push(
				timeMs(() => {
					for (const segments of chains) register(registry, segments);
				}),
			);
			verify.push(timeMs(() => registry.verify()));
			heap.push(heapMb() - before);
			sink = registry; // held until its heap is read

			class BenchPage extends PageObject {
				constructor(p) {
					super(p, "https://shop.example", "/bench");
				}
				defineLocators() {
					for (const segments of chains) register(this.locatorRegistry, segments);
				}
			}
			// construction, then the first locator call runs defineLocators() and verify()
			define.push(timeMs(() => new BenchPage(page).getLocator(chains[0].at(-1).path)));
		}
		scaling.push({
			size: paths,
			register: median(register_),
			verify: median(verify),
			define: median(define),
			heap: median(heap),
		});
	}

	// for scale: one count() of a locator on a small page, a round trip to the browser; 500 calls to warm up, then the
	// median of 200 calls in each of five runs, and the median of those
	await page.setContent('<main><section aria-label="Section 1"><button>Save</button></section></main>');
	const button = page.locator("main").getByRole("button", { name: "Save" });
	for (let i = 0; i < 500; i++) sink = await button.count();
	const roundTrips = [];
	for (let run = 0; run < 5; run++) {
		const times = [];
		for (let i = 0; i < 200; i++) {
			const start = process.hrtime.bigint();
			sink = await button.count();
			times.push(Number(process.hrtime.bigint() - start) / 1e3);
		}
		roundTrips.push(median(times));
	}
	await browser.close();
	// the sink is read once, so it is not dead code either
	writeFileSync(
		outFile,
		JSON.stringify({ perKind, registryCreation, scaling, roundTrip: median(roundTrips), kept: typeof sink }),
	);
}

if (process.argv[2] === "--registry-run") {
	await registryRun(process.argv[3]);
	process.exit(0);
}

// ---- the parent: the machine, the runs, the tables ----

const requested = process.argv.slice(2).filter((arg) => SECTIONS.includes(arg));
const unknown = process.argv.slice(2).filter((arg) => !SECTIONS.includes(arg));
if (unknown.length > 0) {
	console.error(`pnpm bench: unknown section ${unknown.join(", ")}; the sections are ${SECTIONS.join(", ")}`);
	process.exit(1);
}
const sections = requested.length > 0 ? requested : SECTIONS;
const scratch = path.join(os.tmpdir(), `pomwright-bench-${process.pid}`);

/** The CPUs this process may use, as Linux lists them, or every CPU elsewhere. */
function cpusAllowed() {
	try {
		const line = readFileSync("/proc/self/status", "utf8").match(/^Cpus_allowed_list:\s*(.+)$/m);
		if (line) return `${line[1]} (${os.availableParallelism()} of ${os.cpus().length})`;
	} catch {}
	return `all ${os.cpus().length}`;
}

const commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const playwrightVersion = require("@playwright/test/package.json").version;
const loadAtStart = os.loadavg()[0];
console.log(
	`Measured ${new Date().toISOString().slice(0, 10)} at ${commit} with Node ${process.version}, Playwright ${playwrightVersion},`,
);
console.log(
	`${os.cpus()[0].model.trim()}, ${os.platform()} ${os.release()}; CPUs ${cpusAllowed()}; load average ${loadAtStart.toFixed(2)} at the start.`,
);
console.log(RUNS === 1 ? "One run per cell.\n" : `Each cell: the median of ${RUNS} runs, and their range.\n`);

/** Runs a Playwright benchmark; its output is shown when it fails. */
function playwright(args, env) {
	try {
		execFileSync("pnpm", ["-C", "test", "exec", "playwright", "test", "-c", "playwright.bench.config.ts", ...args], {
			cwd: root,
			env: { ...process.env, ...env },
			stdio: "pipe",
			maxBuffer: 64 * 1024 * 1024,
		});
	} catch (error) {
		console.error(`${error.stdout ?? ""}${error.stderr ?? ""}`);
		throw error;
	}
}

const readLines = (file) =>
	readFileSync(file, "utf8")
		.trim()
		.split("\n")
		.filter(Boolean)
		.map((line) => JSON.parse(line));

// a value with its unit, and a range in the same unit
const digits = (value) =>
	value >= 100 ? value.toFixed(0) : value >= 10 ? value.toFixed(1) : value >= 1 ? value.toFixed(2) : value.toFixed(3);
const unitFor = (unit, value) => (unit === "ms" && value >= 1000 ? ["s", 1000] : [unit, 1]);
/** `median unit (min–max)` of `values`. */
function cell(values, unit) {
	const [shown, divisor] = unitFor(unit, median(values));
	const [low, high] = [Math.min(...values), Math.max(...values)].map((value) => digits(value / divisor));
	return `${digits(median(values) / divisor)} ${shown} (${low}–${high})`;
}
const column = (rows, pick) => rows.map(pick);

if (sections.includes("registry")) {
	const runs = [];
	for (let run = 0; run < RUNS; run++) {
		const out = `${scratch}-registry-${run}.json`;
		execFileSync(
			process.execPath,
			["--expose-gc", "--max-old-space-size=8192", import.meta.filename, "--registry-run", out],
			{ cwd: root, stdio: "inherit" },
		);
		runs.push(JSON.parse(readFileSync(out, "utf8")));
		rmSync(out);
	}
	console.log(
		"| path | Playwright chain | `getNestedLocator` | `getLocator` | query, `getNestedLocator()` | registration, per path |",
	);
	console.log("| --- | --- | --- | --- | --- | --- |");
	KINDS.forEach((kind, k) => {
		const rows = runs.map((run) => run.perKind[k]);
		console.log(
			`| ${kind.name} (${kind.segments} segments) | ${cell(
				column(rows, (r) => r.playwright),
				"µs",
			)} | ${cell(
				column(rows, (r) => r.getNestedLocator),
				"µs",
			)} | ${cell(
				column(rows, (r) => r.getLocator),
				"µs",
			)} | ${cell(
				column(rows, (r) => r.query),
				"µs",
			)} | ${cell(
				column(rows, (r) => r.registerPerPath),
				"µs",
			)} |`,
		);
	});
	console.log(
		`\nCreating a registry: ${cell(
			column(runs, (r) => r.registryCreation),
			"µs",
		)}.`,
	);
	console.log(
		"\n| registered paths | registration | `verify()` | page object: `defineLocators()` and `verify()` | heap |",
	);
	console.log("| --- | --- | --- | --- | --- |");
	runs[0].scaling.forEach((first, s) => {
		const rows = runs.map((run) => run.scaling[s]);
		console.log(
			`| ${first.size.toLocaleString("en-US")} | ${cell(
				column(rows, (r) => r.register),
				"ms",
			)} | ${cell(
				column(rows, (r) => r.verify),
				"ms",
			)} | ${cell(
				column(rows, (r) => r.define),
				"ms",
			)} | ${cell(
				column(rows, (r) => r.heap),
				"MB",
			)} |`,
		);
	});
	const roundTrips = column(runs, (r) => r.roundTrip);
	const longest = median(column(runs, (r) => r.perKind.at(-1).getNestedLocator));
	console.log(
		`\nOne \`count()\` round trip on a small page: ${cell(roundTrips, "µs")}; \`getNestedLocator\` on the longest chain is ${((longest / median(roundTrips)) * 100).toFixed(1)}% of its median (${((longest / Math.max(...roundTrips)) * 100).toFixed(1)}% to ${((longest / Math.min(...roundTrips)) * 100).toFixed(1)}%).`,
	);
}

if (sections.includes("fixture")) {
	// five runs of the fixture spec, each in a fresh worker that sets each page object up five times
	const perRun = [];
	for (let run = 0; run < RUNS; run++) {
		const out = `${scratch}-fixture-${run}.jsonl`;
		playwright(["--project=fixture"], { POMWRIGHT_BENCH_OUT: out });
		const cells = new Map();
		for (const sample of readLines(out)) {
			const key = `${sample.size}/${sample.kind}`;
			const entry = cells.get(key) ?? { size: sample.size, kind: sample.kind, ms: [], heap: [] };
			entry.ms.push(sample.ms);
			entry.heap.push(sample.heapMb);
			cells.set(key, entry);
		}
		rmSync(out);
		perRun.push(cells);
	}
	const sizes = [...new Set([...perRun[0].values()].map((entry) => entry.size))];
	const of = (size, kind, field) => perRun.map((cells) => median(cells.get(`${size}/${kind}`)[field]));
	console.log(
		"\n| paths | page object written with Playwright: setup | heap | POMWright page object: setup, `defineLocators()` and `verify()` | heap |",
	);
	console.log("| --- | --- | --- | --- | --- |");
	for (const size of sizes) {
		console.log(
			`| ${size.toLocaleString("en-US")} | ${cell(of(size, "playwright", "ms"), "ms")} | ${cell(of(size, "playwright", "heap"), "MB")} | ${cell(of(size, "pomwright", "ms"), "ms")} | ${cell(of(size, "pomwright", "heap"), "MB")} |`,
		);
	}
}

if (sections.includes("storage")) {
	// at rest: one worker, each browser's spec run in five copies; under the harness's parallel workers: the same copies
	// on half the CPUs this process may use, as the harness's "50%" is half a machine's, the workers side by side
	const workers = Math.max(1, Math.floor(os.availableParallelism() / 2));
	const conditions = [
		{ name: "at rest", args: ["--workers=1", `--repeat-each=${RUNS}`] },
		{ name: `${workers} workers`, args: [`--workers=${workers}`, `--repeat-each=${RUNS}`] },
	];
	const baseline = process.env.POMWRIGHT_BENCH_BASELINE;
	const rows = [];
	for (const condition of conditions) {
		const out = `${scratch}-storage.jsonl`;
		playwright(
			["--project=storage-chromium", "--project=storage-firefox", "--project=storage-webkit", ...condition.args],
			{
				POMWRIGHT_BENCH_OUT: out,
				POMWRIGHT_BENCH_SERVER: "1",
				POMWRIGHT_BENCH_CONDITION: condition.name,
				// another build's require of @playwright/test resolves to the harness's copy
				...(baseline ? { NODE_PATH: path.join(root, "test", "node_modules") } : {}),
			},
		);
		rows.push(...readLines(out));
		rmSync(out);
	}
	const values = (filter, field = "ms") => rows.filter(filter).map((row) => row[field]);
	const builds = ["POMWright", "Playwright", ...(baseline ? ["baseline"] : [])];
	const headers = { POMWright: "POMWright", Playwright: "Playwright's calls", baseline: "baseline build" };
	for (const condition of conditions) {
		for (const browser of ["chromium", "firefox", "webkit"]) {
			console.log(`\n${browser}, ${condition.name}: ms per call`);
			console.log(`\n| call | keys | characters per value | ${builds.map((build) => headers[build]).join(" | ")} |`);
			console.log(`| --- | --- | --- | ${builds.map(() => "---").join(" | ")} |`);
			const calls = [...new Set(rows.filter((row) => !["seed", "quota"].includes(row.call)).map((row) => row.call))];
			const cases = [...new Set(rows.filter((row) => row.call === "set").map((row) => `${row.count}/${row.size}`))];
			for (const call of calls) {
				for (const key of cases) {
					const [count, size] = key.split("/").map(Number);
					const of = (build) =>
						cell(
							values(
								(row) =>
									row.condition === condition.name &&
									row.browser === browser &&
									row.call === call &&
									row.build === build &&
									row.count === count &&
									row.size === size,
							),
							"ms",
						);
					console.log(`| \`${call}\` | ${count} | ${size.toLocaleString("en-US")} | ${builds.map(of).join(" | ")} |`);
				}
			}
			const seeds = ["POMWright", "origin script", "first-arrival script", "no seed"];
			console.log(
				`\n| seed: keys of 1,000 characters | ${seeds.map((name) => `${name}: call | arrival`).join(" | ")} |`,
			);
			console.log(`| --- | ${seeds.map(() => "--- | ---").join(" | ")} |`);
			for (const count of [...new Set(rows.filter((row) => row.call === "seed").map((row) => row.count))]) {
				const of = (name, field) =>
					cell(
						values(
							(row) =>
								row.condition === condition.name &&
								row.browser === browser &&
								row.call === "seed" &&
								row.build === name &&
								row.count === count,
							field,
						),
						"ms",
					);
				console.log(`| ${count} | ${seeds.map((name) => `${of(name, "ms")} | ${of(name, "arrival")}`).join(" | ")} |`);
			}
			const quota = rows.filter(
				(row) => row.condition === condition.name && row.browser === browser && row.call === "quota",
			);
			if (quota.length > 0) {
				const pick = (build) => quota.filter((row) => row.build === build).map((row) => row.ms);
				console.log(
					`\nThe quota: the origin held ${median(quota.map((row) => row.held)).toLocaleString("en-US")} characters, keys and values; \`set\` of ${quota[0].count} values of ${quota[0].size.toLocaleString("en-US")} characters: ${cell(pick("POMWright"), "ms")}; as many \`setItem\` calls: ${cell(pick("Playwright"), "ms")}.`,
				);
			}
		}
	}
}
