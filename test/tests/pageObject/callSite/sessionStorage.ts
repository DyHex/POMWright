// A consumer module that happens to share a POMWright file name: its frames must stay in reported stacks.
import type TestStorageSecond from "@page-object-models/testApp/pages/teststorage/teststorage-second.page";

export const seedLater = (second: TestStorageSecond) => second.sessionStorage.seed({ token: "later" });
