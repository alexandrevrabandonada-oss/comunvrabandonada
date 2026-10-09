import { requireAtomicConnection } from "./atomic-disposable.mjs";
import assert from "node:assert/strict";
import { installSchoolTransaction } from "./transaction-core.mjs";
export {
  expectedCapabilities,
  requireExecutorScope,
  requireControlledPost,
} from "./transaction-core.mjs";

export function requireControlledConnection(db, env = process.env) {
  assert.equal(
    env.COMUN_LEARNING_CONTROLLED_REHEARSAL,
    "true",
    "LEARNING_CONTROLLED_REHEARSAL_REQUIRED",
  );
  assert.equal(
    Number(db.connectionParameters?.port),
    55443,
    "LEARNING_CONTROLLED_LOCAL_PORT_REQUIRED",
  );
  // Same host, role, run database and no-Production-secret policy as the original
  // fixture, with a separate fixed loopback port to preserve existing labs.
  requireAtomicConnection(
    { connectionParameters: { ...db.connectionParameters, port: 55432 } },
    env,
  );
}

// The original lab entry remains fail-closed for all remote destinations.
export async function installControlledRehearsal(
  db,
  capture,
  contract,
  failAt = null,
) {
  requireControlledConnection(db);
  return installSchoolTransaction(db, capture, contract, failAt);
}
