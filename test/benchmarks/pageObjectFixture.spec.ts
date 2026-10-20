import fs from "node:fs";
import v8 from "node:v8";
import vm from "node:vm";
import { test as base, expect, type Locator, type Page } from "@playwright/test";
import { PageObject } from "pomwright";

// A page object with a given number of paths, set up as a fixture: POMWright's, which registers its paths in
// defineLocators(), against one written with Playwright alone, which builds one Locator field per path in its
// constructor, each from its parent's field. Run by `pnpm bench` with playwright.bench.config.ts; each fixture appends
// what its setup took, in time and heap, to the file POMWRIGHT_BENCH_OUT names.

v8.setFlagsFromString("--expose-gc");
const gc = vm.runInNewContext("gc") as () => void;

type Part = { method: "locator"; selector: string } | { method: "getByRole"; role: "region" | "button"; name: string };
type Segment = Part & { path: string; filter?: { hasText: string } };

/** The chains of scripts/benchmark.mjs: short (3) and long (12) paths, plain or with a filter on every segment. */
const KINDS = [
	{ segments: 3, steps: false },
	{ segments: 3, steps: true },
	{ segments: 12, steps: false },
	{ segments: 12, steps: true },
];

function chainsFor(size: number): Segment[][] {
	const chains: Segment[][] = [];
	let paths = 0;
	for (let i = 0; paths < size; i++) {
		const kind = KINDS[i % KINDS.length] ?? { segments: 3, steps: false };
		const parts: Part[] = [{ method: "locator", selector: "main" }];
		for (let s = 1; s < kind.segments - 1; s++) {
			parts.push({ method: "getByRole", role: "region", name: `Section ${s}` });
		}
		parts.push({ method: "getByRole", role: "button", name: "Save" });
		const names = [`c${i}main`, ...parts.slice(1, -1).map((_, s) => `section@s${s + 1}`), "button@save"];
		let current = "";
		const chain = parts.map((part, s) => {
			current = current ? `${current}.${names[s]}` : `${names[s]}`;
			return { ...part, path: current, filter: kind.steps ? { hasText: names[s] ?? "" } : undefined };
		});
		chains.push(chain);
		paths += chain.length;
	}
	return chains;
}

class PomwrightBenchPage extends PageObject<string> {
	constructor(
		page: Page,
		private readonly chains: Segment[][],
	) {
		super(page, "https://shop.example", "/bench");
	}

	protected defineLocators(): void {
		for (const chain of this.chains) {
			for (const segment of chain) {
				const registration = this.add(segment.path);
				const view =
					segment.method === "locator"
						? registration.locator(segment.selector)
						: registration.getByRole(segment.role, { name: segment.name });
				if (segment.filter) view.filter(segment.filter);
			}
		}
	}
}

class PlaywrightBenchPage {
	readonly locators: Record<string, Locator> = {};

	constructor(
		readonly page: Page,
		chains: Segment[][],
	) {
		for (const chain of chains) {
			let target: Page | Locator = page;
			for (const segment of chain) {
				const locator: Locator =
					segment.method === "locator"
						? target.locator(segment.selector)
						: target.getByRole(segment.role, { name: segment.name });
				target = segment.filter ? locator.filter(segment.filter) : locator;
				this.locators[segment.path] = target;
			}
		}
	}
}

/** Times a page object's setup up to the end of the microtask a fixture's `await use()` gives it, and its heap. */
async function setUp<T>(kind: string, size: number, create: () => T): Promise<T> {
	gc();
	const heapBefore = process.memoryUsage().heapUsed;
	const start = process.hrtime.bigint();
	const pageObject = create();
	await Promise.resolve(); // the page object's scheduled defineLocators() and verify() run here
	const ms = Number(process.hrtime.bigint() - start) / 1e6;
	gc();
	const heapMb = (process.memoryUsage().heapUsed - heapBefore) / 1024 / 1024;
	const out = process.env.POMWRIGHT_BENCH_OUT;
	if (out) fs.appendFileSync(out, `${JSON.stringify({ kind, size, ms, heapMb })}\n`);
	return pageObject;
}

const test = base.extend<{
	size: number;
	pomwrightPage: PomwrightBenchPage;
	playwrightPage: PlaywrightBenchPage;
}>({
	size: [100, { option: true }],
	pomwrightPage: async ({ page, size }, use) => {
		const chains = chainsFor(size);
		await use(await setUp("pomwright", chains.flat().length, () => new PomwrightBenchPage(page, chains)));
	},
	playwrightPage: async ({ page, size }, use) => {
		const chains = chainsFor(size);
		await use(await setUp("playwright", chains.flat().length, () => new PlaywrightBenchPage(page, chains)));
	},
});

for (const size of [100, 1_000, 10_000, 100_000]) {
	test.describe(`${size} paths`, () => {
		test.use({ size });

		test("a page object written with Playwright", async ({ playwrightPage }) => {
			expect(playwrightPage.locators["c0main.section@s1.button@save"]).toBeDefined();
		});

		test("a POMWright page object", async ({ pomwrightPage }) => {
			expect(pomwrightPage.getLocator("c0main.section@s1.button@save").description()).toBe(
				"c0main.section@s1.button@save",
			);
		});
	});
}
