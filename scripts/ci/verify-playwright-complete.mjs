#!/usr/bin/env node

import { readFileSync } from "node:fs";

function countTests(suites = []) {
  let total = 0;
  for (const suite of suites) {
    total += (suite.specs ?? []).reduce(
      (sum, spec) => sum + (spec.tests?.length ?? 0),
      0,
    );
    total += countTests(suite.suites ?? []);
  }
  return total;
}

const [listedPath, resultPath] = process.argv.slice(2);
if (!listedPath || !resultPath)
  throw new Error("listed and result JSON paths are required");

const listed = JSON.parse(readFileSync(listedPath, "utf8"));
const result = JSON.parse(readFileSync(resultPath, "utf8"));
const listedCount = countTests(listed.suites);
const passed = result.stats?.expected ?? 0;
const failed = result.stats?.unexpected ?? 0;
const skipped = result.stats?.skipped ?? 0;

if (
  listedCount < 1 ||
  passed !== listedCount ||
  failed !== 0 ||
  skipped !== 0
) {
  throw new Error(
    `COMUN_BROWSER_INCOMPLETE listed=${listedCount} passed=${passed} failed=${failed} skipped=${skipped}`,
  );
}

console.log(`COMUN_BROWSER_COMPLETE listed=${listedCount} passed=${passed}`);
