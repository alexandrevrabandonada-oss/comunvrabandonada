import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflow = await readFile(
  new URL("../../.github/workflows/comun-ci.yml", import.meta.url),
  "utf8",
);
const startup = await readFile(
  new URL("./r2a-supabase-startup.mjs", import.meta.url),
  "utf8",
);

test("R2A private runtime E2E lane is isolated and reproducible", () => {
  assert.match(workflow, /name: COMUN R2A \/ private runtime E2E/);
  assert.match(workflow, /supabase\/setup-cli@v1[\s\S]+version: 2\.109\.1/);
  assert.match(
    workflow,
    /r2a-supabase-startup\.mjs[\s\S]+supabase db reset --local --yes/,
  );
  assert.match(workflow, /r2a-supabase-startup\.mjs/);
  assert.match(
    startup,
    /studio,realtime,mailpit,postgres-meta,edge-runtime,logflare,vector,supavisor,imgproxy/,
  );
  assert.doesNotMatch(workflow, /supabase start[^\n]*--ignore-health-check/);
  assert.doesNotMatch(startup, /--ignore-health-check/);
  assert.match(startup, /COMUN_R2A_SUPABASE_START_PENDING/);
  assert.match(startup, /startup-classification\.json/);
  assert.match(startup, /startup-exit\.txt/);
  assert.match(startup, /12 \* 60 \* 1000/);
  assert.match(workflow, /environment\.txt/);
  assert.match(workflow, /docker-info\.txt/);
  assert.match(startup, /docker inspect/);
  assert.match(startup, /docker logs --tail 200/);
  assert.match(workflow, /docker-disk\.txt/);
  assert.match(workflow, /npm run relata:r2a:private:e2e:local/);
  assert.match(workflow, /npm run relata:r2a:attachment-fix:test/);
  assert.match(workflow, /npm run relata:r2a:wallet-account-fix:test/);
  assert.match(
    workflow,
    /20260805201000_comun_production_pilot_attachment_rpc_fix\.sql/,
  );
  assert.match(
    workflow,
    /20260805212659_comun_production_pilot_wallet_account_rpc_fix\.sql/,
  );
  assert.match(workflow, /supabase stop --no-backup/);
  assert.match(workflow, /COMUN_R2A_E2E_CLEANUP_CONTAINERS_REMAIN/);
  assert.match(workflow, /COMUN_R2A_E2E_CLEANUP_TIMEOUT/);
  assert.match(workflow, /timeout -k 10s 120s supabase stop --no-backup/);
  assert.match(workflow, /docker rm -f/);
  assert.match(workflow, /COMUN_R2A_E2E_CLEANUP_DONE/);
  assert.match(workflow, /test -z "\$\{SUPABASE_ACCESS_TOKEN:-\}"/);
  assert.match(workflow, /test -z "\$\{SUPABASE_DB_URL:-\}"/);
  assert.doesNotMatch(
    workflow,
    /SUPABASE_SERVICE_ROLE_KEY:\s*\$\{\{\s*secrets\./,
  );
});
