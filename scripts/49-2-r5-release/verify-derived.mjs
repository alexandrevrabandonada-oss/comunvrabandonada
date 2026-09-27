import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const [actualPath,expectedPath]=process.argv.slice(2);
if(!actualPath||!expectedPath) throw new Error("COMUN_R5_DERIVED_INPUT_MISSING");
const actual=JSON.parse(readFileSync(actualPath,"utf8"));
const expected=JSON.parse(readFileSync(expectedPath,"utf8"));
for(const key of ["migrationSha256","migrationSetSha256","expectedPreFingerprint",
 "expectedPreCanonicalFingerprint","expectedPostFingerprint","expectedPostCanonicalFingerprint",
 "postgresVersion","blockingFindings","decisionRows","projectionRows","bridgeCount","helperCount","triggerCount"])
 assert.deepEqual(actual[key],expected[key],key);
console.log("COMUN_49_2_R5_DERIVED_MATCHES_PINNED");
