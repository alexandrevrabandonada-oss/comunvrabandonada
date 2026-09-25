import { readFileSync } from "node:fs";

const [productionPath, disposablePath] = process.argv.slice(2);
if (!productionPath || !disposablePath)
  throw new Error("COMUN_R3_PRE_INPUT_MISSING");
const production = JSON.parse(readFileSync(productionPath, "utf8"));
const disposable = JSON.parse(readFileSync(disposablePath, "utf8"));
if (production.scope !== "COMUN_49_2_R3_PRODUCTION_PRE_READ_ONLY" ||
    production.transactionReadOnly !== "on" ||
    production.r1Present !== true || production.r2Present !== true ||
    production.r3Present !== false || production.r12Ledger !== "PRESENT_ACCEPTED" ||
    production.hardeningLedger !== "PRESENT_ACCEPTED" ||
    production.r3LedgerState !== "ABSENT" || production.blockingFindings !== 0 ||
    disposable.target !== "DISPOSABLE" ||
    disposable.runnerFingerprint !== production.runnerFingerprint ||
    disposable.canonicalFingerprint !== production.canonicalFingerprint ||
    disposable.postgresVersion !== production.postgresVersion ||
    disposable.blockingFindings !== 0 ||
    disposable.releaseLedgerState !== "PRESENT_ACCEPTED" ||
    disposable.consentObjectCount !== 6 ||
    JSON.stringify(disposable.migrations) !== JSON.stringify(production.migrations))
  throw new Error("COMUN_49_2_R3_DISPOSABLE_PRE_DRIFT");
console.log("COMUN_49_2_R3_DISPOSABLE_PRE_MATCHES_PRODUCTION");
