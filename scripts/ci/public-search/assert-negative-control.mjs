import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (name) =>
  JSON.parse(readFileSync(`.ci-artifacts/public-search/${name}.json`, "utf8"));
const current = read("current");
const baseline = read("baseline");
assert.equal(current.numPassedTests, 25);
assert.equal(current.numFailedTests, 0);
assert.equal(baseline.numFailedTests, 13);
assert.equal(baseline.numPassedTests, 12);
const cases = baseline.testResults.flatMap((suite) => suite.assertionResults);
assert.equal(
  cases.filter(
    (test) =>
      test.status === "failed" && test.title.startsWith("discards real rows"),
  ).length,
  11,
);
assert.equal(
  cases.find((test) => test.title.startsWith("service_role can read"))?.status,
  "failed",
);
assert.equal(
  cases.find((test) => test.title.startsWith("inner relational filters"))
    ?.status,
  "failed",
);
assert.equal(
  cases.filter(
    (test) =>
      test.status === "passed" && test.title.startsWith("real HTTP error"),
  ).length,
  11,
);
console.log("COMUN_PUBLIC_SEARCH_NEGATIVE_CONTROL_CONFIRMED");
