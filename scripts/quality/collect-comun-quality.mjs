import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const run = (file) =>
  JSON.parse(
    execFileSync(process.execPath, [file], { encoding: "utf8" }).trim(),
  );
const contract = run("scripts/quality/audit-comun-quality.mjs");
const load = run("scripts/quality/load-comun-quality.mjs");
const promoted = process.argv.includes("--promote");
const report = {
  schemaVersion: 1,
  result: promoted
    ? "COMUN_QUALITY_PERFORMANCE_READY_FOR_REAL_DEVICE_REHEARSAL"
    : "COMUN_QUALITY_EVIDENCE_COLLECTED",
  automatedContract: contract.result,
  syntheticLoad: load.result,
  fieldEvidence: "sample_required",
  physicalDevices: "not_rehearsed",
  assistiveTechnology: "not_rehearsed",
  launchPublicly: "not_triggered",
};
const target = path.join(
  process.cwd(),
  "reports/generated/comun-quality-performance-evidence.json",
);
await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, `${JSON.stringify(report, null, 2)}\n`, {
  mode: 0o600,
});
console.log(JSON.stringify(report));
