import type { Reporter, TestCase, TestResult, TestStep } from "@playwright/test/reporter";

// Prints every test.step title (category "test.step"), so the probe shows what the report shows.
export default class StepReporter implements Reporter {
	onStepBegin(test: TestCase, _result: TestResult, step: TestStep) {
		if (step.category === "test.step")
			console.log(`STEP [${test.parent.project()?.name}] ${test.title} :: ${step.title}`);
	}
}
