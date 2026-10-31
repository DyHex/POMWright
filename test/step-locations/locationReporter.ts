import { readFileSync } from "node:fs";
import path from "node:path";
import type {
	FullConfig,
	FullResult,
	Reporter,
	Suite,
	TestCase,
	TestResult,
	TestStep,
} from "@playwright/test/reporter";

const ID = /LOCATION ([\w-]+)/;

/**
 * Fails the run when a step or an error carrying `LOCATION <id>` is reported away from the line marked with that id, and
 * when a marked line is never checked (a probe that stops reporting would otherwise pass).
 */
export default class LocationReporter implements Reporter {
	private readonly markers = new Map<string, Map<string, number>>();
	private readonly failures: string[] = [];
	private readonly seen = new Set<string>();
	private checked = 0;

	onBegin(_config: FullConfig, suite: Suite): void {
		for (const test of suite.allTests()) {
			this.markerLine(test.location.file, "");
		}
	}

	private markerLine(file: string, id: string): number | undefined {
		let lines = this.markers.get(file);
		if (lines === undefined) {
			lines = new Map();
			readFileSync(file, "utf8")
				.split("\n")
				.forEach((line, index) => {
					const match = /\/\/ LOCATION ([\w.-]+)$/.exec(line.trimEnd());
					if (match?.[1] !== undefined) {
						lines?.set(match[1], index + 1);
					}
				});
			this.markers.set(file, lines);
		}
		return lines.get(id);
	}

	private check(what: string, test: TestCase, id: string, location: { file: string; line: number } | undefined) {
		this.checked++;
		this.seen.add(`${test.location.file}#${id}`);
		const expected = this.markerLine(test.location.file, id);
		const reported = location ? `${path.basename(location.file)}:${location.line}` : "no location";
		if (expected === undefined) {
			this.failures.push(`${what} "${id}": no line is marked // LOCATION ${id}`);
		} else if (location?.file !== test.location.file || location.line !== expected) {
			this.failures.push(
				`${what} "${id}": expected ${path.basename(test.location.file)}:${expected}, reported ${reported}`,
			);
		}
	}

	onStepEnd(test: TestCase, _result: TestResult, step: TestStep): void {
		if (step.category !== "test.step") {
			return;
		}
		// a step titled by its class and method (`@step` without a title) is marked with that title
		const id =
			ID.exec(step.title)?.[1] ??
			(this.markerLine(test.location.file, step.title) === undefined ? undefined : step.title);
		if (id !== undefined) {
			this.check("step", test, id, step.location);
		}
	}

	onTestEnd(test: TestCase, result: TestResult): void {
		for (const error of result.errors) {
			const id = ID.exec(error.message ?? "")?.[1];
			if (id !== undefined) {
				this.check("error", test, id, error.location);
			}
		}
	}

	async onEnd(_result: FullResult): Promise<{ status: FullResult["status"] } | undefined> {
		if (this.checked === 0) {
			this.failures.push("no step or error was checked");
		}
		for (const [file, lines] of this.markers) {
			for (const [id, line] of lines) {
				if (!this.seen.has(`${file}#${id}`)) {
					this.failures.push(`"${id}" at ${path.basename(file)}:${line}: no step or error with this id was reported`);
				}
			}
		}
		if (this.failures.length === 0) {
			console.log(`step locations: ${this.checked} checked, all where they were called`);
			return undefined;
		}
		console.error(`step locations: ${this.failures.length} wrong\n  ${this.failures.join("\n  ")}`);
		return { status: "failed" };
	}
}
