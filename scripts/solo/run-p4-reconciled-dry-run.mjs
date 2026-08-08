import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const externalRelative = "supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql";
const expectedExternalSha = "6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be";
const candidate = "20260808180246_comun_sidewalk_relata_real.sql";
const external = path.join(root, externalRelative);
assert.equal(path.basename(root), "COMUM VR ABANDONADA");
assert.equal(createHash("sha256").update(await readFile(external)).digest("hex"), expectedExternalSha);

const quarantine = await mkdtemp(path.join(tmpdir(), "comun-p4-dry-run-"));
const held = path.join(quarantine, path.basename(external));
let moved = false;
try {
  await rename(external, held);
  moved = true;
  const listed = spawnSync("npx", ["supabase", "migration", "list", "--linked"], {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  process.stdout.write(listed.stdout);
  process.stderr.write(listed.stderr);
  assert.equal(listed.status, 0, "COMUN_P4_REMOTE_MIGRATION_LIST_FAILED");

  const dry = spawnSync("npx", ["supabase", "db", "push", "--linked", "--dry-run"], {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  process.stdout.write(dry.stdout);
  process.stderr.write(dry.stderr);
  assert.equal(dry.status, 0, "COMUN_P4_REMOTE_DRY_RUN_FAILED");
  const output = `${dry.stdout}\n${dry.stderr}`;
  assert.equal(output.includes("--include-all"), false, "COMUN_P4_REMOTE_PLAN_REQUESTED_INCLUDE_ALL");
  const planned = [...output.matchAll(/(20\d{12}_[a-z0-9_]+\.sql)/gi)].map((match) => match[1]);
  assert.deepEqual([...new Set(planned)], [candidate], "COMUN_P4_REMOTE_PLAN_NOT_EXACT_ONE");
  console.log(JSON.stringify({ result: "COMUN_P4_REMOTE_PLAN_EXACT_ONE", migration: candidate, externalLedgerExceptionRestored: true }));
} finally {
  if (moved) await rename(held, external);
  await rm(quarantine, { recursive: true, force: true });
  assert.equal(createHash("sha256").update(await readFile(external)).digest("hex"), expectedExternalSha);
}
