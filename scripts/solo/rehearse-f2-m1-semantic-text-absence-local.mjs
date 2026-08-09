import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import pg from "pg";

const dbUrl = process.env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL ?? "";
if (!/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):\d+\/postgres(?:[/?]|$)/.test(dbUrl)) {
  throw new Error("COMUN_F2_M1_LOCAL_DATABASE_REQUIRED");
}

const client = new pg.Client({ connectionString: dbUrl });
const token = () => randomBytes(32).toString("base64url");
const fullPhotoDecision = {
  captureBasis: "photo_only",
  semanticTextState: "absent",
  captureState: "captured_private",
  requiresEnrichment: true,
};

function params(overrides = {}) {
  return {
    idempotencyKey: token(),
    receiptSecret: token(),
    originalText: "Texto civico valido.",
    answers: {},
    category: "other",
    urgency: "attention",
    ruleVersion: "relata-routing-v1",
    decision: {},
    privacyClass: "restricted",
    consentVersion: "relata-consent-v1",
    ...overrides,
  };
}

function call(input) {
  return client.query(
    "select * from public.comun_relata_create($1,$2,$3,$4::jsonb,$5,$6,$7,$8::jsonb,$9,$10)",
    [
      input.idempotencyKey,
      input.receiptSecret,
      input.originalText,
      JSON.stringify(input.answers),
      input.category,
      input.urgency,
      input.ruleVersion,
      JSON.stringify(input.decision),
      input.privacyClass,
      input.consentVersion,
    ],
  );
}

async function rejects(input, pattern) {
  await client.query("savepoint expected_rejection");
  try {
    await assert.rejects(call(input), pattern);
  } finally {
    await client.query("rollback to savepoint expected_rejection");
    await client.query("release savepoint expected_rejection");
  }
}

await client.connect();
try {
  await client.query("begin");

  for (const text of ["12345678", "x".repeat(600)]) {
    const created = await call(params({ originalText: text }));
    assert.equal(created.rows[0].idempotent, false);
  }

  for (const text of ["1234567", "x".repeat(601), "", "       "]) {
    await rejects(params({ originalText: text }), /COMUN_RELATA_INVALID_PROOF/);
  }

  await rejects(
    params({ originalText: null, decision: {}, privacyClass: "sensitive" }),
    /COMUN_RELATA_INVALID_PHOTO_ONLY_CONTRACT/,
  );
  await rejects(
    params({
      originalText: null,
      decision: { ...fullPhotoDecision, captureBasis: "text" },
      privacyClass: "sensitive",
    }),
    /COMUN_RELATA_INVALID_PHOTO_ONLY_CONTRACT/,
  );
  await rejects(
    params({
      originalText: null,
      decision: { ...fullPhotoDecision, semanticTextState: "provided" },
      privacyClass: "sensitive",
    }),
    /COMUN_RELATA_INVALID_PHOTO_ONLY_CONTRACT/,
  );
  await rejects(
    params({
      originalText: null,
      decision: { captureBasis: "photo_only", semanticTextState: "absent" },
      privacyClass: "sensitive",
    }),
    /COMUN_RELATA_INVALID_PHOTO_ONLY_CONTRACT/,
  );

  const photo = params({
    originalText: null,
    decision: fullPhotoDecision,
    privacyClass: "sensitive",
  });
  const firstPhoto = await call(photo);
  assert.equal(firstPhoto.rows[0].idempotent, false);
  const replayPhoto = await call(photo);
  assert.equal(replayPhoto.rows[0].idempotent, true);
  assert.equal(replayPhoto.rows[0].protocol, firstPhoto.rows[0].protocol);

  const photoRow = await client.query(
    `select r.original_text, r.privacy_class, r.routing_decision, c.id as case_id, c.state
       from private.comun_relata_reports r
       join public.comun_relata_cases c on c.report_id = r.id
      where c.protocol = $1`,
    [firstPhoto.rows[0].protocol],
  );
  assert.equal(photoRow.rowCount, 1);
  assert.equal(photoRow.rows[0].original_text, null);
  assert.equal(photoRow.rows[0].privacy_class, "sensitive");
  assert.equal(photoRow.rows[0].state, "stored_private");
  assert.deepEqual(
    {
      captureBasis: photoRow.rows[0].routing_decision.captureBasis,
      semanticTextState: photoRow.rows[0].routing_decision.semanticTextState,
      captureState: photoRow.rows[0].routing_decision.captureState,
      requiresEnrichment: photoRow.rows[0].routing_decision.requiresEnrichment,
      publication: photoRow.rows[0].routing_decision.publication,
      automaticForwarding: photoRow.rows[0].routing_decision.automaticForwarding,
    },
    {
      captureBasis: "photo_only",
      semanticTextState: "absent",
      captureState: "captured_private",
      requiresEnrichment: true,
      publication: "never_automatic",
      automaticForwarding: false,
    },
  );

  const sideEffects = await client.query(
    `select
       (select count(*)::int from public.comun_relata_public_snapshots where case_id = $1) as publications,
       (select count(*)::int from private.comun_forwarding_packages where relata_case_id = $1) as forwardings`,
    [photoRow.rows[0].case_id],
  );
  assert.deepEqual(sideEffects.rows[0], { publications: 0, forwardings: 0 });

  const membership = await client.query(
    "select to_regclass('public.comun_relata_case_memberships')::text as relation",
  );
  if (membership.rows[0].relation) {
    const collective = await client.query(
      "select count(*)::int as count from public.comun_relata_case_memberships where individual_case_id = $1 and active",
      [photoRow.rows[0].case_id],
    );
    assert.equal(collective.rows[0].count, 0);
  }

  await rejects(
    { ...photo, originalText: "Agora existe texto semantico." },
    /COMUN_RELATA_IDEMPOTENCY_CONFLICT/,
  );

  const textFirst = params({ originalText: "Texto primeiro para conflito." });
  await call(textFirst);
  await rejects(
    {
      ...textFirst,
      originalText: null,
      decision: fullPhotoDecision,
      privacyClass: "sensitive",
    },
    /COMUN_RELATA_IDEMPOTENCY_CONFLICT/,
  );

  const legacy = params({
    idempotencyKey: "L".repeat(32),
    receiptSecret: "R".repeat(32),
    originalText: "Texto legado compativel.",
    answers: { blocked: "nao" },
  });
  const legacyDecision = {
    category: "other",
    urgency: "attention",
    ruleVersion: "relata-routing-v1",
    source: "deterministic_server_route",
  };
  const legacyReport = await client.query(
    `insert into private.comun_relata_reports(
       original_text, triage_answers, receipt_hash, actor_hash, idempotency_hash,
       payload_hash, privacy_class, routing_rule_version, routing_decision, urgency,
       consent_version, retention_class, review_after
     ) values (
       $1, $2::jsonb,
       extensions.digest('relata-receipt-v1:' || $3, 'sha256'),
       extensions.digest('relata-actor-v1:' || $3, 'sha256'),
       extensions.digest('relata-idempotency-v1:' || $4, 'sha256'),
       decode('5f62615dcc23595872bedba02133279a58eb6ed60a73ef0ef94dba2736c5cca7', 'hex'),
       'restricted', 'relata-routing-v1', $5::jsonb, 'attention',
       'relata-consent-v1', 'private_unsubmitted', now() + interval '90 days'
     ) returning id`,
    [
      legacy.originalText,
      JSON.stringify(legacy.answers),
      legacy.receiptSecret,
      legacy.idempotencyKey,
      JSON.stringify(legacyDecision),
    ],
  );
  await client.query(
    `insert into public.comun_relata_cases(
       report_id, protocol, category, urgency, routing_rule_version,
       routing_decision, state
     ) values ($1, 'COMUN-RELATA-A1B2C3D4E5F60708', 'other', 'attention',
       'relata-routing-v1', $2::jsonb, 'stored_private')`,
    [legacyReport.rows[0].id, JSON.stringify(legacyDecision)],
  );
  const legacyReplay = await call(legacy);
  assert.equal(legacyReplay.rows[0].idempotent, true);
  assert.equal(legacyReplay.rows[0].protocol, "COMUN-RELATA-A1B2C3D4E5F60708");

  const metadata = await client.query(
    `select
       not a.attnotnull as original_text_nullable,
       exists (
         select 1 from pg_constraint con
         where con.conrelid = 'private.comun_relata_reports'::regclass
           and con.conname = 'comun_relata_reports_original_text_semantics_check'
       ) as semantic_constraint,
       has_function_privilege('public', p.oid, 'execute') as public_execute,
       has_function_privilege('anon', p.oid, 'execute') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute,
       has_function_privilege('service_role', p.oid, 'execute') as service_role_execute
     from pg_attribute a
     cross join pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     where a.attrelid = 'private.comun_relata_reports'::regclass
       and a.attname = 'original_text'
       and n.nspname = 'public'
       and p.proname = 'comun_relata_create'
       and pg_get_function_identity_arguments(p.oid) =
         'p_idempotency_key text, p_receipt_secret text, p_original_text text, p_answers jsonb, p_category text, p_urgency text, p_rule_version text, p_decision jsonb, p_privacy_class text, p_consent_version text'`,
  );
  assert.deepEqual(metadata.rows[0], {
    original_text_nullable: true,
    semantic_constraint: true,
    public_execute: false,
    anon_execute: false,
    authenticated_execute: false,
    service_role_execute: true,
  });

  console.log(
    JSON.stringify({
      result: "COMUN_F2_M1_SEMANTIC_TEXT_ABSENCE_DISPOSABLE_GREEN",
      legacyPayloadHashVector:
        "5f62615dcc23595872bedba02133279a58eb6ed60a73ef0ef94dba2736c5cca7",
      photoOnlyOriginalText: null,
      publicationCount: 0,
      forwardingCount: 0,
    }),
  );
} finally {
  try {
    await client.query("rollback");
  } finally {
    await client.end();
  }
}
