import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflow = await readFile(new URL("../../.github/workflows/comun-ci.yml", import.meta.url), "utf8");

test("R2A private runtime E2E lane is isolated and reproducible", () => {
  assert.match(workflow, /name: COMUN R2A \/ private runtime E2E/);
  assert.match(workflow, /supabase\/setup-cli@v1[\s\S]+version: 2\.109\.1/);
  assert.match(workflow, /supabase start[\s\S]+supabase db reset --local --yes/);
  assert.match(workflow, /npm run relata:r2a:private:e2e:local/);
  assert.match(workflow, /npm run relata:r2a:attachment-fix:test/);
  assert.match(workflow, /20260805201000_comun_production_pilot_attachment_rpc_fix\.sql/);
  assert.match(workflow, /supabase stop --no-backup/);
  assert.match(workflow, /COMUN_R2A_E2E_CLEANUP_CONTAINERS_REMAIN/);
  assert.match(workflow, /test -z "\$\{SUPABASE_ACCESS_TOKEN:-\}"/);
  assert.match(workflow, /test -z "\$\{SUPABASE_DB_URL:-\}"/);
  assert.doesNotMatch(workflow, /SUPABASE_SERVICE_ROLE_KEY:\s*\$\{\{\s*secrets\./);
});
