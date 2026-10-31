// import and require of the installed package give one copy: the ESM entry re-exports the CommonJS build, so a project
// that mixes ESM specs and a CommonJS config holds one PageObject (scripts/consumer-check.sh --node-floor).
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const esm = await import("pomwright");
const cjs = require("pomwright");
const differing = ["PageObject", "SessionStorage", "test", "json", "step"].filter((name) => esm[name] !== cjs[name]);
if (differing.length > 0) {
	console.error(`node ${process.version}: import and require differ for ${differing.join(", ")}`);
	process.exit(1);
}
console.log(`node ${process.version}: import and require share one copy`);
