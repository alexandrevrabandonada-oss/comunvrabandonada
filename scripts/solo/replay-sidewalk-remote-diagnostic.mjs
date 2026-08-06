import { readFile, writeFile } from "node:fs/promises";
import { classifyScopedExternalLedger } from "./diagnose-sidewalk-remote-drift.mjs";

const arg = (name) =>
  process.argv.find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1);

const diagnosticPath = arg("--diagnostic");
const referencePath = arg("--reference");
const outputPath = arg("--output");
if (!diagnosticPath || !referencePath || !outputPath) {
  throw new Error("COMUN_SIDEWALK_REPLAY_INPUT_REQUIRED");
}

const diagnostic = JSON.parse(await readFile(diagnosticPath, "utf8"));
const reference = JSON.parse(await readFile(referencePath, "utf8"));
const scopedClassification = classifyScopedExternalLedger({
  scopedObserved: diagnostic.scoped?.remoteObserved,
  scopedPost: reference.scopedPost,
  ledger: diagnostic.ledger,
  objects: diagnostic.objects,
  grantAudit: diagnostic.grantAudit,
  scopedUnreadable: !diagnostic.scoped?.remoteObserved,
});
const laterMigrations = (diagnostic.migrations ?? []).some(
  (value) => String(value) > "20260724233256",
);
const globalEvolution =
  scopedClassification === "APPLIED_EXACT_SCOPED_EXTERNAL_LEDGER" &&
  diagnostic.global?.observed &&
  diagnostic.global.observed !== diagnostic.global.expectedPre &&
  diagnostic.global.observed !== diagnostic.global.expectedPost &&
  laterMigrations
    ? "EXPECTED_GLOBAL_EVOLUTION_AFTER_SCOPED_RELEASE"
    : null;

const result = {
  classification: scopedClassification,
  globalEvolution,
  ledger: diagnostic.ledger,
  scopedObserved: diagnostic.scoped?.remoteObserved ?? null,
  scopedPost: reference.scopedPost,
  grantClassification: diagnostic.grantAudit?.classification ?? null,
  zeroRemoteWrites: true,
};
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result));
