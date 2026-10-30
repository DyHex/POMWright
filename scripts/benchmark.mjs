// Measures what POMWright's locator calls cost against the installed package, beside the same chains built with
// Playwright's own locator methods, and prints the tables of website/src/content/docs/internal/performance.md.
//
//   pnpm bench            # after `pnpm harness:install`; runs this file with --expose-gc and a larger heap
//
// Four kinds of path: short (3 segments) and long (12 segments), each with plain definitions or with one filter step
// per definition. Every segment of a path is registered, so a chain has one Playwright locator per segment. Locator
// methods build objects in Node and talk to no browser, so a real chromium page is only the target they are built on.
// The numbers are a median over runs; they depend on the machine, so the page prints its own beside them. They are
// taken at rest, on one worker with nothing else running: a declared condition, not what a loaded test run sees.

import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(path.join(root, "package.json"));
const { chromium } = require("@playwright/test");
const playwrightVersion = require("@playwright/test/package.json").version;
const { createRegistryWithAccessors, PageObject } = require(path.join(root, ".pack/pomwright/dist/index.js"));

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

/** The same chain written with Playwright's locator methods. */
function playwrightChain(page, segments) {
	let target = page;
	for (const segment of segments) {
		target = target[segment.method](...segment.args);
		if (segment.filter) target = target.filter(segment.filter);
	}
	return target;
}

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

/** Microseconds per call of `fn`, the median of `runs` runs of `calls` calls each, after a warm-up run. */
function perCall(fn, calls, runs = 7) {
	for (let i = 0; i < calls; i++) fn(i);
	const times = [];
	for (let run = 0; run < runs; run++) {
		const start = process.hrtime.bigint();
		for (let i = 0; i < calls; i++) fn(i);
		times.push(Number(process.hrtime.bigint() - start) / 1e3 / calls);
	}
	return median(times);
}

function timeMs(fn) {
	const start = process.hrtime.bigint();
	const result = fn();
	return { ms: Number(process.hrtime.bigint() - start) / 1e6, result };
}

const heapMb = () => {
	globalThis.gc?.();
	return process.memoryUsage().heapUsed / 1024 / 1024;
};

const format = (value) =>
	value >= 100 ? value.toFixed(0) : value >= 10 ? value.toFixed(1) : value >= 1 ? value.toFixed(2) : value.toFixed(3);
const formatMs = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${format(ms)} ms`);

const browser = await chromium.launch();
const page = await browser.newPage();

// Per call, one chain of each kind
const perKind = [];
for (const kind of KINDS) {
	const segments = segmentsOf("", kind);
	const terminal = segments.at(-1).path;
	const { registry } = createRegistryWithAccessors(page);
	register(registry, segments);
	registry.verify();
	let n = 0;
	const registration = perCall(() => {
		const fresh = createRegistryWithAccessors(page).registry;
		register(fresh, segmentsOf(`r${n++}`, kind));
	}, 2_000);
	perKind.push({
		kind,
		registerPerPath: registration / kind.segments,
		playwright: perCall(() => playwrightChain(page, segments), 20_000),
		getNestedLocator: perCall(() => registry.getNestedLocator(terminal), 20_000),
		getLocator: perCall(() => registry.getLocator(terminal), 20_000),
		query: perCall(() => registry.getLocatorSchema(terminal).getNestedLocator(), 20_000),
	});
}

// Scaling: a registry of a mix of the four kinds, registered, verified, and defined through a page object
const sizes = [100, 1_000, 10_000, 100_000, 1_000_000];
const scaling = [];
for (const size of sizes) {
	const chains = [];
	let paths = 0;
	for (let i = 0; paths < size; i++) {
		const segments = segmentsOf(`c${i}`, KINDS[i % KINDS.length]);
		chains.push(segments);
		paths += segments.length;
	}
	const runs = size <= 10_000 ? 5 : 1;
	const registerTimes = [];
	const verifyTimes = [];
	const defineTimes = [];
	let memory = 0;
	for (let run = 0; run < runs; run++) {
		const before = heapMb();
		const { registry } = createRegistryWithAccessors(page);
		registerTimes.push(
			timeMs(() => {
				for (const segments of chains) register(registry, segments);
			}).ms,
		);
		verifyTimes.push(timeMs(() => registry.verify()).ms);
		memory = heapMb() - before;

		class BenchPage extends PageObject {
			constructor(p) {
				super(p, "https://shop.example", "/bench");
			}
			defineLocators() {
				for (const segments of chains) register(this.locatorRegistry, segments);
			}
		}
		// construction, then the first locator call runs defineLocators() and verify()
		defineTimes.push(timeMs(() => new BenchPage(page).getLocator(chains[0].at(-1).path)).ms);
	}
	scaling.push({
		size: paths,
		register: median(registerTimes),
		verify: median(verifyTimes),
		define: median(defineTimes),
		memory,
	});
}
await browser.close();

// A page object set up as a fixture in the Playwright runner, POMWright's against one written with Playwright alone
const fixtureOut = path.join(os.tmpdir(), `pomwright-bench-${process.pid}.jsonl`);
execFileSync("pnpm", ["-C", "test", "exec", "playwright", "test", "-c", "playwright.bench.config.ts"], {
	cwd: root,
	env: { ...process.env, POMWRIGHT_BENCH_OUT: fixtureOut },
	stdio: "ignore",
});
const fixtureRuns = new Map();
for (const line of readFileSync(fixtureOut, "utf8").trim().split("\n")) {
	const run = JSON.parse(line);
	const key = `${run.size}`;
	const row = fixtureRuns.get(key) ?? {
		size: run.size,
		playwright: { ms: [], heap: [] },
		pomwright: { ms: [], heap: [] },
	};
	row[run.kind].ms.push(run.ms);
	row[run.kind].heap.push(run.heapMb);
	fixtureRuns.set(key, row);
}
rmSync(fixtureOut);

const commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
console.log(
	`Measured ${new Date().toISOString().slice(0, 10)} at ${commit} with Node ${process.version}, Playwright ${playwrightVersion},`,
);
console.log(`${os.cpus()[0].model.trim()}, ${os.platform()} ${os.release()}.\n`);

console.log(
	"| path | Playwright chain | `getNestedLocator` | `getLocator` | query, `getNestedLocator()` | registration, per path |",
);
console.log("| --- | --- | --- | --- | --- | --- |");
for (const row of perKind) {
	console.log(
		`| ${row.kind.name} (${row.kind.segments} segments) | ${format(row.playwright)} µs | ${format(row.getNestedLocator)} µs | ${format(row.getLocator)} µs | ${format(row.query)} µs | ${format(row.registerPerPath)} µs |`,
	);
}
console.log(
	"\n| registered paths | registration | `verify()` | page object: `defineLocators()` and `verify()` | heap |",
);
console.log("| --- | --- | --- | --- | --- |");
for (const row of scaling) {
	console.log(
		`| ${row.size.toLocaleString("en-US")} | ${formatMs(row.register)} | ${formatMs(row.verify)} | ${formatMs(row.define)} | ${format(row.memory)} MB |`,
	);
}
console.log(
	"\n| paths | page object written with Playwright: setup | heap | POMWright page object: setup, `defineLocators()` and `verify()` | heap |",
);
console.log("| --- | --- | --- | --- | --- |");
for (const row of fixtureRuns.values()) {
	console.log(
		`| ${row.size.toLocaleString("en-US")} | ${formatMs(median(row.playwright.ms))} | ${format(median(row.playwright.heap))} MB | ${formatMs(median(row.pomwright.ms))} | ${format(median(row.pomwright.heap))} MB |`,
	);
}
