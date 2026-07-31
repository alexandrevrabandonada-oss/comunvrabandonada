import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  RESULT,
  sanitizedError,
  writeEvidence,
  writeFailureEvidence,
} from "./comun-security-contract.mjs";

try {
  const policy = await readFile(
    path.resolve("docs/comun-retention-exclusion.md"),
    "utf8",
  );
  for (const required of [
    "Upload não confirmado",
    "Foto abandonada",
    "Original cultural",
    "Derivada pública",
    "Consentimento",
    "Contribuição rejeitada",
    "Contato",
    "Inbox",
    "Logs e auditoria",
    "Artifact",
    "Dado sintético",
    "Backup efêmero",
    "Sessão",
    "Pedido de retirada",
  ])
    assert.match(policy, new RegExp(required, "i"));
  assert.match(policy, /não inventa prazo legal/i);
  assert.match(policy, /Dados reais não são apagados automaticamente/i);

  const tracked = execFileSync("git", ["ls-files", "app", "lib", "scripts"], {
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter(Boolean);
  const excessive = [];
  for (const file of tracked) {
    const source = await readFile(file, "utf8").catch(() => "");
    for (const match of source.matchAll(/createSignedUrl\([^,\n]+,\s*(\d+)/g)) {
      if (Number(match[1]) > 900) excessive.push("signed_url_over_15_minutes");
    }
  }
  assert.equal(excessive.length, 0);

  await writeEvidence("60-retention.json", {
    result: RESULT.retention,
    policyTypes: 14,
    legalDeadlineInvented: false,
    realDataDeleted: false,
    automation: {
      dryRun: "allowed",
      syntheticQuarantine: "allowed",
      fixtureCleanup: "allowed",
      temporaryCleanup: "allowed",
      ephemeralBackupDeletion: "required",
    },
    signedUrlMaximum: "15_minutes",
    excessiveSignedUrls: 0,
    irreversibleRealDeletionGate: "required",
  });
  console.log(RESULT.retention);
} catch (error) {
  await writeFailureEvidence("retention", error);
  console.error(sanitizedError(error));
  process.exitCode = 1;
}
