import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

// Where a broken page object is built decides what the run shows (the table in the docs' "How a mistake is
// reported"): which tests fail, how far each body gets, which tests do not run. A test cannot observe that about
// itself, and test.fail() would change it (a serial group goes on after an expected failure), so this spec starts
// lifecycle-outcomes/ as a run of its own, on this project's browser, and compares its JSON report with the table. It
// reads the table from the page too, so the page and this spec change together.

type ReportSuite = {
	title: string;
	suites?: ReportSuite[];
	specs?: {
		title: string;
		tests: {
			results: {
				status: string;
				annotations: { type: string; description?: string }[];
				errors: { message?: string }[];
			}[];
		}[];
	}[];
};

type Outcome = { status: string; reached: string[]; errors: string[] };

const LABELED =
	'TypoPage: Locator registry verification failed for 1 of 2 paths:\n  "body.heading": No locator schema registered for path "body.headng".';

const runOutcomes = (project: string, outputDir: string) =>
	new Promise<{ stdout: string; stderr: string }>((resolve) => {
		const cli = require.resolve("@playwright/test/cli");
		const args = [cli, "test", "-c", "lifecycle-outcomes/playwright.config.ts", `--project=${project}`];
		execFile(
			process.execPath,
			[...args, "--reporter=json", `--output=${outputDir}`],
			{ cwd: path.join(__dirname, "../.."), maxBuffer: 64 * 1024 * 1024 },
			// the run fails on purpose; its report is the result
			(_error, stdout, stderr) => resolve({ stdout, stderr }),
		);
	});

/** Each test of the report as `group › title`: its status, the points its body reached, and its distinct errors. */
const outcomesOf = (suite: ReportSuite, groups: string[] = []): Record<string, Outcome> => {
	const outcomes: Record<string, Outcome> = {};
	for (const spec of suite.specs ?? []) {
		for (const { results } of spec.tests) {
			const result = results.at(-1);
			outcomes[[...groups, spec.title].join(" › ")] = {
				status: result?.status ?? "not run",
				reached: (result?.annotations ?? []).flatMap((note) =>
					note.type === "reached" ? [note.description ?? ""] : [],
				),
				errors: [
					...new Set(
						(result?.errors ?? []).map(({ message = "" }) => (message.includes(LABELED) ? "labeled" : message)),
					),
				],
			};
		}
	}
	for (const child of suite.suites ?? []) {
		Object.assign(outcomes, outcomesOf(child, child.title.endsWith(".spec.ts") ? groups : [...groups, child.title]));
	}
	return outcomes;
};

const failedBeforeTheBody: Outcome = { status: "failed", reached: [], errors: ["labeled"] };
const failedAtTheFirstUse: Outcome = { status: "failed", reached: ["body"], errors: ["labeled"] };

/** The table of *Page objects*, row by row as the page writes it, and the outcomes of lifecycle-outcomes/ each row
 * stands for. */
const TABLE: { builtIn: string; result: string; outcomes: Record<string, Outcome> }[] = [
	{
		builtIn: "a test-scoped or worker-scoped fixture",
		result: "the test fails before its body runs",
		outcomes: {
			"a test-scoped fixture › first": failedBeforeTheBody,
			"a test-scoped fixture › second": failedBeforeTheBody,
			"a worker-scoped fixture › first": failedBeforeTheBody,
			"a worker-scoped fixture › second": failedBeforeTheBody,
		},
	},
	{
		builtIn: "`beforeEach`",
		result: "each test fails; its body runs until its first use of the page object",
		outcomes: { "beforeEach › first": failedAtTheFirstUse, "beforeEach › second": failedAtTheFirstUse },
	},
	{
		builtIn: "`beforeAll`",
		result:
			"every test of the group fails, each body running until its first use; in a `serial` group the first test fails and the others do not run",
		outcomes: {
			"beforeAll › first": failedAtTheFirstUse,
			"beforeAll › second": failedAtTheFirstUse,
			"beforeAll in a serial group › first": failedAtTheFirstUse,
			"beforeAll in a serial group › second": { status: "skipped", reached: [], errors: [] },
		},
	},
];

/** The rows of the table under "| built in | result |" on *Page objects*, each as its two cells. */
const tableOnPage = () => {
	const page = readFileSync(path.join(__dirname, "../../../website/src/content/docs/docs/page-objects.md"), "utf8");
	const lines = page.split("\n");
	const header = lines.indexOf("| built in | result |");
	if (header === -1) {
		throw new Error("page-objects.md has no table headed | built in | result |");
	}
	const rows: string[][] = [];
	for (const line of lines.slice(header + 2)) {
		if (!line.startsWith("|")) {
			break;
		}
		rows.push(
			line
				.slice(1, -1)
				.split(" | ")
				.map((cell) => cell.trim()),
		);
	}
	return rows;
};

test("a broken page object fails the run as the docs' table says for each place it is built", async ({
	browserName,
}, testInfo) => {
	// a whole Playwright run of its own: 12.5 s at rest, and up to about 57 s with 8 copies on 4 CPUs, where 60 s did not
	// always suffice; test.slow() triples the timeout, whatever it is
	test.slow();
	const { stdout, stderr } = await runOutcomes(browserName, testInfo.outputPath("run"));
	let report: ReportSuite;
	try {
		report = JSON.parse(stdout);
	} catch {
		throw new Error(`the run of lifecycle-outcomes/ wrote no report:\n${stderr}`);
	}
	expect(tableOnPage()).toEqual(TABLE.map(({ builtIn, result }) => [builtIn, result]));
	expect(outcomesOf(report)).toEqual(Object.assign({}, ...TABLE.map(({ outcomes }) => outcomes)));
});
