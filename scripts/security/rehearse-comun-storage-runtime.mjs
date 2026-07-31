import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  RESULT,
  sanitizedError,
  syntheticTag,
  writeEvidence,
  writeFailureEvidence,
} from "./comun-security-contract.mjs";

try {
  const configuredEndpoint = process.env.ARCHIVE_PROCESSING_ENDPOINT;
  const token = process.env.ARCHIVE_PROCESSING_CRON_SECRET;
  const signingKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!configuredEndpoint || !token || !signingKey)
    throw new Error("COMUN_STORAGE_RUNTIME_BOUNDARY_MISSING");
  const endpoint = new URL(configuredEndpoint);
  endpoint.pathname = "/api/internal/security/storage-restore";
  endpoint.search = "";
  endpoint.hash = "";
  const attemptId = syntheticTag("runtime-storage");
  const requestedAt = Date.now();
  const signature = createHmac("sha256", signingKey)
    .update(`${requestedAt}.${attemptId}.tijolo-47-8`)
    .digest("hex");
  const response = await fetch(endpoint, {
    method: "POST",
    redirect: "manual",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-COMUN-Rehearsal-Purpose": "tijolo-47-8",
      "X-COMUN-Requested-At": String(requestedAt),
      "X-COMUN-Rehearsal-Signature": signature,
    },
    body: JSON.stringify({ attemptId }),
    signal: AbortSignal.timeout(65_000),
  });
  if (!response.ok)
    throw new Error("COMUN_STORAGE_RUNTIME_REHEARSAL_REQUEST_FAILED");
  const evidence = await response.json();
  assert.equal(evidence.result, RESULT.storageRestore);
  assert.equal(evidence.cleanup?.realObjectsDeleted, false);
  assert.equal(evidence.evidenceBoundary?.objectKeysExposed, false);
  assert.equal(evidence.evidenceBoundary?.credentialsExposed, false);
  await writeEvidence("35-storage-restore.json", evidence);
  console.log(RESULT.storageRestore);
} catch (error) {
  await writeFailureEvidence("storage_restore_runtime", error);
  console.error(sanitizedError(error));
  process.exitCode = 1;
}
