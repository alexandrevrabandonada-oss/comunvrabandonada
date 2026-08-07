import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflow = await readFile(new URL("../../.github/workflows/comun-ci.yml", import.meta.url), "utf8");
const harness = await readFile(new URL("./rehearse-p2-relata-text-private-local.mjs", import.meta.url), "utf8");

test("P2 textual Relata lane is isolated and evidence-off", () => {
  assert.match(workflow, /name: COMUN P2 \/ private textual Relata E2E/);
  assert.match(workflow, /relata:p2:text:e2e:local/);
  assert.match(workflow, /COMUN_RELATA_LOCAL_EVIDENCE=disabled/);
  assert.match(workflow, /COMUN_RELATA_PERSISTENCE_ENABLED=disabled/);
  assert.match(workflow, /test -z "\$\{SUPABASE_ACCESS_TOKEN:-\}"/);
  assert.match(workflow, /supabase db reset --local --yes/);
  assert.match(workflow, /r2a-supabase-startup\.mjs/);
  assert.match(workflow, /supabase stop --no-backup/);
  assert.match(workflow, /timeout -k 10s 120s supabase stop --no-backup/);
  assert.match(harness, /COMUN_P2_RELATA_TEXT_DISPOSABLE_E2E_GREEN/);
  assert.match(harness, /data-comun-quick-capture-v2/);
  assert.match(harness, /public_snapshot_count|publicSnapshotCount/);
  assert.match(harness, /evidence\/attachments/);
  assert.match(harness, /evidence\/location/);
  assert.doesNotMatch(harness, /supabase\.co|vercel\.app|wa\.me/);
});
