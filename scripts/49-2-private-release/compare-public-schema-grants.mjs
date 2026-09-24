import { readFileSync, writeFileSync } from "node:fs";
const [expectedPath, actualPath, outputPath] = process.argv.slice(2);
if (!expectedPath || !actualPath || !outputPath)
  throw new Error("COMUN_49_2_SCHEMA_GRANT_COMPARE_INPUT_MISSING");
const expected = JSON.parse(readFileSync(expectedPath, "utf8"));
const actual = JSON.parse(readFileSync(actualPath, "utf8"));
if (
  expected.transactionReadOnly !== "on" ||
  actual.transactionReadOnly !== "on"
) throw new Error("COMUN_49_2_SCHEMA_GRANT_COMPARE_NOT_READ_ONLY");
const key = (x) => `${x.grantee}:${x.privilege}`;
const e = new Set(expected.grants.map(key));
const a = new Set(actual.grants.map(key));
const onlyExpected = [...e].filter((x) => !a.has(x)).sort();
const onlyActual = [...a].filter((x) => !e.has(x)).sort();
writeFileSync(outputPath, `${JSON.stringify({
  scope:"COMUN_49_2_PUBLIC_SCHEMA_GRANT_DIFF",
  onlyExpected,
  onlyActual,
  expectedCount: expected.grants.length,
  actualCount: actual.grants.length
}, null, 2)}\n`);
console.log(`COMUN_49_2_PUBLIC_SCHEMA_GRANT_DIFF:${onlyActual.join(",") || "NONE"}`);
