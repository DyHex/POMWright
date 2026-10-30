import { appendFileSync } from "node:fs";
import path from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { SessionStorage } from "pomwright";

// What the session storage calls cost on each browser, beside the fewest plain Playwright calls that do the same
// storage work: set against one page.sessionStorage.setItem per key, get(keys) against one getItem per key, get()
// against items(), clear(keys) against one removeItem per key and clear() against clear(), each awaited in turn as a
// test would write them. seed is timed at the call and at the arrival (the page.goto to the seeded origin), against two
// init scripts written by hand: one that writes the entries when location.origin is the origin, and one that also
// writes only on the first arrival there; and the arrival with no seed at all. The quota: how many characters an
// origin holds, and set filling most of it against setItem. Run by `pnpm bench` with playwright.bench.config.ts, on the
// test server's pages, at rest (one worker) and under the harness's parallel workers (POMWRIGHT_BENCH_CONDITION); each
// case appends its median to the file POMWRIGHT_BENCH_OUT names. With POMWRIGHT_BENCH_BASELINE, the directory of
// another build (an extracted package), set, get and clear run with that build's SessionStorage too.
//
// One test per case, on one page shared by the file's tests: Playwright records every call of a test as a step, and a
// call costs more the more steps its test already has (about 30% more after 9,000), so a single test holding every case
// would charge the later ones for the earlier ones.

const A = "http://localhost:9000";
const B = "http://127.0.0.1:9000";
const OUT = process.env.POMWRIGHT_BENCH_OUT;
const CONDITION = process.env.POMWRIGHT_BENCH_CONDITION ?? "at rest";
const LOADED = CONDITION !== "at rest";
const CALLS = ["set", "get(keys)", "get()", "clear(keys)", "clear()"];
const KEY_COUNTS = [1, 10, 100];
const VALUE_SIZES = [10, 1_000];
const WARM_UP = 3;
const SAMPLES = LOADED ? 7 : 10;

/** The calls measured, typed loosely: the keys and values are built at run time, not literals. */
type StorageCalls = {
	set(entries: Record<string, string>): Promise<void>;
	get(keys?: readonly string[]): Promise<unknown>;
	clear(keys?: readonly string[]): Promise<void>;
	seed(entries: Record<string, string>): Promise<void>;
};
type Build = { name: string; create: (page: Page, origin?: string) => StorageCalls };

const builds: Build[] = [
	{
		name: "POMWright",
		create: (page, origin) =>
			new SessionStorage(page, origin === undefined ? {} : { origin }) as unknown as StorageCalls,
	},
];
if (process.env.POMWRIGHT_BENCH_BASELINE) {
	// another build of POMWright; its own require of @playwright/test resolves through NODE_PATH to the harness's copy
	const other = require(
		path.join(process.env.POMWRIGHT_BENCH_BASELINE, "dist", "index.js"),
	) as typeof import("pomwright");
	builds.push({
		name: "baseline",
		create: (page, origin) =>
			new other.SessionStorage(page, origin === undefined ? {} : { origin }) as unknown as StorageCalls,
	});
}

const entriesOf = (count: number, size: number): Record<string, string> =>
	Object.fromEntries(Array.from({ length: count }, (_, i) => [`k${i}`, `${i}:`.padEnd(size, "x")]));

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? Number.NaN;

/** The median milliseconds of `run` after a warm-up, with `prepare` before each call and outside the timer. */
async function measure(
	prepare: () => Promise<unknown>,
	run: () => Promise<unknown>,
	samples = SAMPLES,
	warmUp = WARM_UP,
) {
	const times: number[] = [];
	for (let i = 0; i < warmUp + samples; i++) {
		await prepare();
		const start = process.hrtime.bigint();
		await run();
		const ms = Number(process.hrtime.bigint() - start) / 1e6;
		if (i >= warmUp) times.push(ms);
	}
	return median(times);
}

function record(row: Record<string, unknown>) {
	if (!OUT) return;
	const { project, repeatEachIndex } = test.info();
	appendFileSync(
		OUT,
		`${JSON.stringify({ section: "storage", condition: CONDITION, browser: project.name.replace("storage-", ""), copy: repeatEachIndex, ...row })}\n`,
	);
}

test.describe.configure({ mode: "serial" });
let page: Page;
test.beforeAll(async ({ browser }) => {
	page = await browser.newPage();
});
test.afterAll(async () => {
	await page.close();
});

/** Writes entries in one evaluation, outside the timer, so a read or a removal has something to work on. */
const fill = (entries: Record<string, string>) =>
	page.evaluate((all) => {
		sessionStorage.clear();
		for (const [key, value] of Object.entries(all)) sessionStorage.setItem(key, value);
	}, entries);

/** The five calls, for one build: what each does, and what it needs before it. */
function callsOf(
	build: string,
	entries: Record<string, string>,
): { call: string; prepare: () => Promise<unknown>; run: () => Promise<unknown> }[] {
	const keys = Object.keys(entries);
	const empty = () => page.sessionStorage.clear();
	const filled = () => fill(entries);
	const ready = async () => {};
	if (build === "Playwright") {
		const storage = page.sessionStorage;
		return [
			{
				call: "set",
				prepare: empty,
				run: async () => {
					for (const key of keys) await storage.setItem(key, entries[key] ?? "");
				},
			},
			{
				call: "get(keys)",
				prepare: ready,
				run: async () => {
					for (const key of keys) await storage.getItem(key);
				},
			},
			{ call: "get()", prepare: ready, run: () => storage.items() },
			{
				call: "clear(keys)",
				prepare: filled,
				run: async () => {
					for (const key of keys) await storage.removeItem(key);
				},
			},
			{ call: "clear()", prepare: filled, run: () => storage.clear() },
		];
	}
	const storage = builds.find((candidate) => candidate.name === build)?.create(page);
	if (storage === undefined) throw new Error(`no build ${build}`);
	return [
		{ call: "set", prepare: empty, run: () => storage.set(entries) },
		{ call: "get(keys)", prepare: ready, run: () => storage.get(keys) },
		{ call: "get()", prepare: ready, run: () => storage.get() },
		{ call: "clear(keys)", prepare: filled, run: () => storage.clear(keys) },
		{ call: "clear()", prepare: filled, run: () => storage.clear() },
	];
}

for (const count of KEY_COUNTS) {
	for (const size of VALUE_SIZES) {
		for (const build of [...builds.map((candidate) => candidate.name), "Playwright"]) {
			for (const call of CALLS) {
				test(`${build}: ${call}, ${count} keys of ${size} characters`, async () => {
					const entries = entriesOf(count, size);
					await page.goto(`${A}/testnav`);
					await fill(entries);
					const one = callsOf(build, entries).find((candidate) => candidate.call === call);
					if (one === undefined) throw new Error(`no call ${call}`);
					record({ build, call, count, size, ms: await measure(one.prepare, one.run) });
					// the storage holds what the call leaves: the entries after set and get, nothing after clear
					const left = (await page.sessionStorage.items()).length;
					expect(left).toBe(call.startsWith("clear") ? 0 : count);
				});
			}
		}
	}
}

/** An init script that writes the entries when the document's origin is the seeded one. */
const originScript = ({ origin, entries }: { origin: string; entries: Record<string, string> }) => {
	if (location.origin !== origin) return;
	for (const [key, value] of Object.entries(entries)) sessionStorage.setItem(key, value);
};
/** The same, writing only on the first arrival on the origin, as seed does. */
const firstArrivalScript = ({ origin, entries }: { origin: string; entries: Record<string, string> }) => {
	const activation = (globalThis as { navigation?: { activation?: { from: unknown } | null } }).navigation?.activation;
	if (location.origin !== origin || activation?.from) return;
	for (const [key, value] of Object.entries(entries)) sessionStorage.setItem(key, value);
};

const SEEDS: Record<string, (entries: Record<string, string>) => Promise<{ dispose(): Promise<void> } | undefined>> = {
	POMWright: async (entries) => {
		await builds[0]?.create(page, B).seed(entries);
		return undefined;
	},
	"origin script": (entries) => page.addInitScript(originScript, { origin: B, entries }),
	"first-arrival script": (entries) => page.addInitScript(firstArrivalScript, { origin: B, entries }),
	"no seed": async () => undefined,
};

for (const count of [10, 100]) {
	const size = 1_000;
	for (const [name, call] of Object.entries(SEEDS)) {
		test(`seed, ${name}: ${count} keys of ${size} characters, the call and the arrival`, async () => {
			const entries = entriesOf(count, size);
			const calls: number[] = [];
			const arrivals: number[] = [];
			for (let i = 0; i < WARM_UP + SAMPLES; i++) {
				await page.goto(`${A}/testnav`);
				let start = process.hrtime.bigint();
				const script = await call(entries);
				const callMs = Number(process.hrtime.bigint() - start) / 1e6;
				start = process.hrtime.bigint();
				await page.goto(`${B}/teststorage`);
				const arrivalMs = Number(process.hrtime.bigint() - start) / 1e6;
				if (name !== "no seed") {
					expect(await page.evaluate(() => sessionStorage.getItem("k0"))).toBe(entries.k0);
				}
				await script?.dispose();
				await page.sessionStorage.clear();
				if (i >= WARM_UP) {
					calls.push(callMs);
					arrivals.push(arrivalMs);
				}
			}
			record({ build: name, call: "seed", count, size, ms: median(calls), arrival: median(arrivals) });
		});
	}
}

test("the quota", async () => {
	test.skip(LOADED, "measured at rest only");
	await page.goto(`${A}/testnav`);
	// how many characters, keys and values, the origin holds: values of 100,000 characters until the browser refuses one
	const value = "x".repeat(100_000);
	await page.sessionStorage.clear();
	let stored = 0;
	let held = 0;
	for (; ; stored++) {
		const key = `q${stored}`;
		const refused = await page.sessionStorage.setItem(key, value).then(
			() => false,
			() => true,
		);
		if (refused) break;
		held += key.length + value.length;
	}
	await page.sessionStorage.clear();
	const count = Math.floor(stored * 0.9);
	const entries = Object.fromEntries(Array.from({ length: count }, (_, i) => [`q${i}`, value]));
	const empty = () => page.sessionStorage.clear();
	const row = { call: "quota", count, size: value.length, held };
	const storage = builds[0]?.create(page);
	record({
		...row,
		build: "POMWright",
		ms: await measure(empty, () => storage?.set(entries) ?? Promise.resolve(), 3, 1),
	});
	record({
		...row,
		build: "Playwright",
		ms: await measure(
			empty,
			async () => {
				for (const [key, item] of Object.entries(entries)) await page.sessionStorage.setItem(key, item);
			},
			3,
			1,
		),
	});
	expect(await page.sessionStorage.getItem(`q${count - 1}`)).toBe(value);
});
