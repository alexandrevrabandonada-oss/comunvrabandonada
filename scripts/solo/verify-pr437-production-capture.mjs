import { readFile } from "node:fs/promises";
import {
  loadReleaseContract,
  requireProductionCapture,
  sha256,
} from "./pr437-search-proof-contract.mjs";

const arg = (key) =>
  process.argv
    .find((value) => value.startsWith(`--${key}=`))
    ?.slice(key.length + 3);
const bytes = await readFile(arg("capture"));
if (sha256(bytes) !== arg("capture-sha256"))
  throw new Error("COMUN_SEARCH_LINT_PRODUCTION_ARTIFACT_HASH_MISMATCH");
const { reference, release, manifestSha256 } = await loadReleaseContract();
requireProductionCapture(JSON.parse(bytes), reference, release, manifestSha256);
console.log("COMUN_PR437_PRODUCTION_CAPTURE_CONTRACT_GREEN");
