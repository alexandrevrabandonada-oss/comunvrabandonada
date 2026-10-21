import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { X509Certificate, createHash } from "node:crypto";
import test from "node:test";
import { load } from "js-yaml";

const read = (path) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const caPath = "scripts/security/supabase-prod-ca-2021.crt";
const extraCa = "${{ github.workspace }}/" + caPath;
const historicalPreflights = ["a1", "c1", "d1", "e2", "e3"];
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
  [
    ".github/workflows/comun-learning-production-pre.yml",
    "read-only-capture",
    "Allowlisted catalog-only capture, never schema promotion",
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

test("School capture keeps read-only options and isolates the disposable job from Production", () => {
  const w = load(read(cases[2][0]));
  const step = w.jobs["read-only-capture"].steps.find(
    (s) => s.name === cases[2][2],
  );
  assert.equal(step.run, "node scripts/learning/production-pre.mjs");
  assert.equal(step.env.PGOPTIONS, "-c default_transaction_read_only=on");
  assert.equal(step.env.SUPABASE_DB_URL, "${{ secrets.SUPABASE_DB_URL }}");
  assert.match(
    read("scripts/learning/production-pre.mjs"),
    /REPEATABLE READ READ ONLY/,
  );
  const disposable = JSON.stringify(w.jobs["production-like-disposable"]);
  assert.doesNotMatch(
    disposable,
    /secrets\.|SUPABASE_DB_URL|NODE_EXTRA_CA_CERTS/,
  );
});

test("A7 psql steps use the pinned public CA with verified TLS and read-only defaults", () => {
  const workflow = load(read(".github/workflows/comun-48-4-a7-preflight.yml"));
  assert.equal(workflow.env?.PGSSLROOTCERT, undefined);
  const job = workflow.jobs["zero-schema-metadata-only"];
  assert.equal(job.env.PGSSLROOTCERT, undefined);
  const names = [
    "Prove zero migration and inspect metadata read-only",
    "Prove A7-scoped remote migration plan",
  ];
  for (const name of names) {
    const step = job.steps.find((s) => s.name === name);
    assert.ok(step);
    assert.equal(step.env.PGSSLROOTCERT, extraCa);
    assert.equal(step.env.PGSSLMODE, "verify-full");
    assert.equal(step.env.PGOPTIONS, "-c default_transaction_read_only=on");
    assert.doesNotMatch(
      step.run,
      /sslmode=(disable|allow|prefer|require)|NODE_TLS_REJECT_UNAUTHORIZED/,
    );
  }
  for (const step of job.steps.filter((s) => !names.includes(s.name))) {
    assert.equal(step.env?.PGSSLROOTCERT, undefined);
  }
  assert.match(
    job.steps.find((s) => s.name === names[0]).run,
    /begin read only;/,
  );
  assert.match(job.steps.find((s) => s.name === names[0]).run, /rollback;/);
  const planStep = job.steps.find((s) => s.name === names[1]);
  assert.match(planStep.run, /a7-scoped-readonly-migration-plan\.mjs/);
  assert.match(
    planStep.run,
    /unrelatedPendingMigration=20261006134804_comun_learning_r0\.sql/,
  );
  assert.doesNotMatch(planStep.run, /migrationCount=0/);
});

for (const lane of historicalPreflights) {
  test(`${lane}: historical preflight transports stay verified and read-only`, () => {
    const workflow = load(
      read(`.github/workflows/comun-48-3-${lane}-preflight.yml`),
    );
    assert.equal(workflow.env?.PGSSLROOTCERT, undefined);
    let protectedSteps = 0;
    for (const job of Object.values(workflow.jobs)) {
      assert.equal(job.env?.PGSSLROOTCERT, undefined);
      for (const step of job.steps ?? []) {
        const databaseStep =
          /psql "\$SUPABASE_DB_URL"|node scripts\/ci\/readonly-reconciled-migration-plan\.mjs|supabase db push --db-url/.test(
            step.run ?? "",
          );
        if (!databaseStep) {
          assert.equal(step.env?.PGSSLROOTCERT, undefined);
          continue;
        }
        protectedSteps++;
        assert.equal(step.env.PGSSLROOTCERT, extraCa);
        assert.equal(step.env.PGSSLMODE, "verify-full");
        assert.equal(step.env.PGOPTIONS, "-c default_transaction_read_only=on");
        assert.doesNotMatch(
          step.run,
          /sslmode=(disable|allow|prefer|require)|NODE_TLS_REJECT_UNAUTHORIZED|supabase\s+(?:migration\s+repair|db\s+reset)\b/,
        );
        if (step.run.includes('psql "$SUPABASE_DB_URL"')) {
          assert.match(step.run, /begin read only;/i);
          assert.match(step.run, /rollback;/i);
        }
        if (step.run.includes("supabase db push --db-url"))
          assert.match(step.run, /--dry-run/);
      }
    }
    assert.equal(protectedSteps, 2);
  });
}

// Metadata SQL remains pinned. Reviewed domain-scoped routes retain separate
// acceptance/refusal coverage in capture-readonly-domain-migration-status.node-test.mjs.
const discoveryPreflightContracts = [
  {
    file: "comun-48-2-a-remote-preflight.yml",
    job: "remote-read-only-preflight",
    name: "Reconcile remote migration metadata in a read-only transaction",
    sha256: "6d2ea3bf632c1c84e3c8b5889f83b5c4bedf1171be955560153d565e10801307",
  },
  {
    file: "comun-48-4-a1-preflight.yml",
    job: "remote-metadata-only",
    name: "Inspect economic metadata without business content",
    sha256: "7a7cfc440ad707bb70149d5b2f3f7291721f99d2f46aaf1c3a510dda765f5e29",
  },
  {
    file: "comun-48-4-a1-preflight.yml",
    job: "remote-metadata-only",
    name: "Prove exact migration plan",
    sha256: "60908f9e74abca1faa855df1177359e9116020937c838dec763624b5a6180e0c",
  },
  {
    file: "comun-48-4-a2-preflight.yml",
    job: "remote-metadata-only",
    name: "Inspect only identity and authorization metadata",
    sha256: "6586cf29db424e0012426b954e2c27c0b1ae46afe013f7cdf8489a033a91cf3a",
  },
  {
    file: "comun-48-4-a2-preflight.yml",
    job: "remote-metadata-only",
    name: "Prove one bounded migration plan",
    sha256: "437e8bafdeb9759b4581a54dc359982f86b41918771008bb3af4d2c68c25b88b",
  },
  {
    file: "comun-48-4-a3-preflight.yml",
    job: "remote-metadata-only",
    name: "Inspect only authorization and storage metadata",
    sha256: "c532faf7ff9adc9715831386a4a3978333ab9155aefb16be825217a677e96f05",
  },
  {
    file: "comun-48-4-a3-preflight.yml",
    job: "remote-metadata-only",
    name: "Prove one bounded migration plan",
    sha256: "0dae4fd910fb05153a4b31f79032c554696c9d5ba13af6276a54b78950dad967",
  },
  {
    file: "comun-48-4-a4-preflight.yml",
    job: "remote-metadata-only",
    name: "Inspect only A1, A2, A3 and review metadata",
    sha256: "91b716d44fa3e821613786ee9f2b7290215cbf832f3b72abebd0b4bc84750dee",
  },
  {
    file: "comun-48-4-a4-preflight.yml",
    job: "remote-metadata-only",
    name: "Prove exactly one bounded A4 migration plan",
    sha256: "caeae47063e71e54af63c1c24e4e32701445d46f7aa08895f7fe6ce0fb080ba3",
  },
  {
    file: "comun-48-4-a5-preflight.yml",
    job: "remote-metadata-only",
    name: "Inspect only metadata and privileges",
    sha256: "8dce38d98c1c8081df546a6c0062674d963110b04cf96d5724d86bad1b0f3c05",
  },
  {
    file: "comun-48-4-a5-preflight.yml",
    job: "remote-metadata-only",
    name: "Prove exactly one bounded migration plan",
    sha256: "a73841e5452323a1c56f3d9e1ef939cbb2f0149be25118db97cc11a4a74a725c",
  },
  {
    file: "comun-48-4-a6-preflight.yml",
    job: "remote-metadata-only",
    name: "Inspect only metadata, constraints and privileges",
    sha256: "044ba8cabbb0f0f10abc44da93ac0752de56baee4d31fec72137a697b7c75fbf",
  },
  {
    file: "comun-48-4-a6-preflight.yml",
    job: "remote-metadata-only",
    name: "Prove exactly one bounded migration plan",
    sha256: "f55d7e39961d702a8528e7e11bc867a38b128d621f24efb5b55555ef6a78b18d",
  },
];
for (const entry of discoveryPreflightContracts) {
  test(`${entry.file}: ${entry.name} preserves its read-only script and scoped verified TLS`, () => {
    const workflow = load(read(`.github/workflows/${entry.file}`));
    assert.equal(workflow.env?.PGSSLROOTCERT, undefined);
    const job = workflow.jobs[entry.job];
    assert.equal(job.env?.PGSSLROOTCERT, undefined);
    const step = job.steps.find((s) => s.name === entry.name);
    assert.ok(step);
    assert.equal(step.env.PGSSLROOTCERT, extraCa);
    assert.equal(step.env.PGSSLMODE, "verify-full");
    assert.equal(step.env.PGOPTIONS, "-c default_transaction_read_only=on");
    assert.equal(
      createHash("sha256").update(step.run).digest("hex"),
      entry.sha256,
    );
    assert.doesNotMatch(
      step.run,
      /sslmode=(disable|allow|prefer|require)|NODE_TLS_REJECT_UNAUTHORIZED/,
    );
    for (const other of job.steps.filter(
      (s) =>
        !discoveryPreflightContracts.some(
          (e) => e.file === entry.file && e.name === s.name,
        ),
    ))
      assert.equal(other.env?.PGSSLROOTCERT, undefined);
  });
}
