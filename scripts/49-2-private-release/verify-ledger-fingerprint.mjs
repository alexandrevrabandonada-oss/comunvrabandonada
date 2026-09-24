import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const before = JSON.parse(readFileSync(process.argv[2], "utf8"));
const after = JSON.parse(readFileSync(process.argv[3], "utf8"));
assert.equal(before.runnerFingerprint, after.runnerFingerprint);
assert.equal(before.canonicalFingerprint, after.canonicalFingerprint);
assert.deepEqual(before.migrations, after.migrations);
assert.equal(after.blockingFindings, 0);
console.log("COMUN_49_2_PRIVATE_RELEASE_LEDGER_FINGERPRINT_STABLE");
