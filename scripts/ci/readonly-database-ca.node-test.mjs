import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { X509Certificate } from "node:crypto";
import test from "node:test";
import { load } from "js-yaml";

const read = (path) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const caPath = "scripts/security/supabase-prod-ca-2021.crt";
const extraCa = "${{ github.workspace }}/" + caPath;
const cases = [
  [
    ".github/workflows/comun-quality-performance.yml",
    "post-merge",
    "Verificação de schema estritamente read-only",
  ],
  [
    ".github/workflows/comun-civic-graph.yml",
    "consistency",
    "Contagens agregadas somente leitura",
  ],
];

test("the checked-in public CA is the same pinned certificate as the server-only client", () => {
  const cert = new X509Certificate(read(caPath));
  const source = read("lib/supabase-database-tls.ts");
  const embedded = source.match(
    /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/,
  )[0];
  assert.deepEqual(cert.raw, new X509Certificate(embedded).raw);
  assert.ok(cert.ca);
  assert.equal(cert.checkIssued(cert), true);
  assert.equal(
    cert.fingerprint256,
    "80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA",
  );
});

for (const [path, jobId, stepName] of cases) {
  test(`${jobId}: CA is scoped only to the existing read-only database step`, () => {
    const workflow = load(read(path));
    assert.equal(workflow.env?.NODE_EXTRA_CA_CERTS, undefined);
    const selected = workflow.jobs[jobId].steps.find(
      (step) => step.name === stepName,
    );
    assert.ok(selected);
    assert.equal(selected.env.NODE_EXTRA_CA_CERTS, extraCa);
    assert.equal(selected.env.NODE_TLS_REJECT_UNAUTHORIZED, undefined);
    for (const [id, job] of Object.entries(workflow.jobs)) {
      assert.equal(job.env?.NODE_EXTRA_CA_CERTS, undefined);
      for (const step of job.steps ?? []) {
        if (id === jobId && step === selected) continue;
        assert.equal(step.env?.NODE_EXTRA_CA_CERTS, undefined);
      }
    }
  });
}

test("Quality keeps read-only PGOPTIONS, the verifier and the original credential scope", () => {
  const w = load(read(cases[0][0]));
  const step = w.jobs["post-merge"].steps.find((s) => s.name === cases[0][2]);
  assert.equal(
    step.run,
    "node scripts/quality/verify-comun-quality-remote.mjs",
  );
  assert.equal(step.env.PGOPTIONS, "-c default_transaction_read_only=on");
  assert.equal(step.env.SUPABASE_DB_URL, "${{ secrets.SUPABASE_DB_URL }}");
  assert.match(
    read("scripts/quality/verify-comun-quality-remote.mjs"),
    /BEGIN READ ONLY/,
  );
});

test("Civic keeps required remote verification and a read-only transaction", () => {
  const w = load(read(cases[1][0]));
  const step = w.jobs.consistency.steps.find((s) => s.name === cases[1][2]);
  assert.match(step.run, /--require-remote/);
  assert.match(
    read("scripts/civic-graph/audit-comun-civic-graph-consistency.mjs"),
    /begin transaction read only/,
  );
});
