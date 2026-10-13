import pg from "pg";
import { runLearningDatabaseContract } from "./database-contract.mjs";

// No fallback to shared Supabase/project URLs. Requires a disposable local DB.
const url = new URL(process.env.COMUN_LEARNING_TEST_DATABASE_URL || "http://missing");
if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
    url.pathname !== '/escola_test' ||
    process.env.COMUN_LEARNING_DISPOSABLE_DATABASE !== 'true') {
  throw new Error('Escola contract requires disposable localhost /escola_test database.');
}
const db = new pg.Client({ connectionString: url.toString() });
try {
  await db.connect();
  await runLearningDatabaseContract(db);
  console.log('COMUN_LEARNING_DATABASE_GREEN migration=1 missions=24 rls=6 cleanup=rollback');
} finally {
  await db.end();
}
