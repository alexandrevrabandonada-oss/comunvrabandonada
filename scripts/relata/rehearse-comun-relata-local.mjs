import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

const { Client } = pg;
const databaseUrl =
  process.env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL ??
  process.env.PR23_DATABASE_URL ??
  "";

if (
  !/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):\d{1,5}\/postgres(?:[/?]|$)/.test(
    databaseUrl,
  )
) {
  throw new Error("COMUN_RELATA_LOCAL_DATABASE_REQUIRED");
}

const proof = () => randomBytes(32).toString("base64url");
const fixture = (overrides = {}) => ({
  idempotencyKey: proof(),
  receiptSecret: proof(),
  text: "A rua está toda escura desde ontem à noite.",
  answers: { homes_power: "nao" },
  category: "public_lighting",
  urgency: "attention",
  ruleVersion: "relata-routing-v1",
  decision: { explanation: "Triagem determinística local." },
  privacyClass: "public_after_sanitization",
  consentVersion: "relata-consent-v1",
  ...overrides,
});

async function connect() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  return client;
}

async function asRole(role, callback, subject = null) {
  const client = await connect();
  try {
    await client.query("begin");
    await client.query(`set local role ${role}`);
    if (subject) {
      await client.query(
        "select set_config('request.jwt.claim.sub', $1, true)",
        [subject],
      );
    }
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

async function createReport(input) {
  return asRole("service_role", (client) =>
    client.query(
      `select * from public.comun_relata_create(
        $1,$2,$3,$4::jsonb,$5,$6,$7,$8::jsonb,$9,$10
      )`,
      [
        input.idempotencyKey,
        input.receiptSecret,
        input.text,
        input.answers,
        input.category,
        input.urgency,
        input.ruleVersion,
        input.decision,
        input.privacyClass,
        input.consentVersion,
      ],
    ),
  );
}

const first = fixture();
const firstCreate = await createReport(first);
assert.equal(firstCreate.rowCount, 1);
assert.equal(firstCreate.rows[0].state, "stored_private");
assert.equal(firstCreate.rows[0].idempotent, false);
assert.match(firstCreate.rows[0].protocol, /^COMUN-RELATA-[A-F0-9]{16}$/);

const sequential = await createReport(first);
assert.equal(sequential.rows[0].protocol, firstCreate.rows[0].protocol);
assert.equal(sequential.rows[0].idempotent, true);

await assert.rejects(
  createReport(
    fixture({ answers: { homes_power: "nao", private_note: "não permitir" } }),
  ),
  /COMUN_RELATA_INVALID_TRIAGE/,
);
await assert.rejects(
  createReport(fixture({ ruleVersion: "relata-routing-v2" })),
  /COMUN_RELATA_INVALID_CONTRACT/,
);

await assert.rejects(
  createReport({
    ...first,
    text: "Payload incompatível para a mesma chave opaca.",
  }),
  /COMUN_RELATA_IDEMPOTENCY_CONFLICT/,
);

const concurrentInput = fixture();
const [concurrentA, concurrentB] = await Promise.all([
  createReport(concurrentInput),
  createReport(concurrentInput),
]);
assert.equal(concurrentA.rows[0].protocol, concurrentB.rows[0].protocol);
assert.deepEqual(
  [concurrentA.rows[0].idempotent, concurrentB.rows[0].idempotent].sort(),
  [false, true],
);
assert.notEqual(concurrentA.rows[0].protocol, firstCreate.rows[0].protocol);

const wrongReceipt = await asRole("service_role", (client) =>
  client.query("select * from public.comun_relata_get_receipt($1,$2)", [
    firstCreate.rows[0].protocol,
    proof(),
  ]),
);
const nonexistent = await asRole("service_role", (client) =>
  client.query("select * from public.comun_relata_get_receipt($1,$2)", [
    "COMUN-RELATA-0000000000000000",
    proof(),
  ]),
);
assert.equal(wrongReceipt.rowCount, 0);
assert.equal(nonexistent.rowCount, 0);

const ownReceipt = await asRole("service_role", (client) =>
  client.query("select * from public.comun_relata_get_receipt($1,$2)", [
    firstCreate.rows[0].protocol,
    first.receiptSecret,
  ]),
);
assert.equal(ownReceipt.rowCount, 1);
assert.equal(ownReceipt.rows[0].timeline.length, 4);

const postgres = await connect();
const caseRow = await postgres.query(
  "select id, report_id, routing_decision from public.comun_relata_cases where protocol = $1",
  [firstCreate.rows[0].protocol],
);
const caseId = caseRow.rows[0].id;
const reportId = caseRow.rows[0].report_id;
assert.equal(caseRow.rows[0].routing_decision.category, "public_lighting");
assert.equal(caseRow.rows[0].routing_decision.urgency, "attention");
assert.equal(caseRow.rows[0].routing_decision.ruleVersion, "relata-routing-v1");
assert.equal(caseRow.rows[0].routing_decision.source, "deterministic_server_route");
const counts = await postgres.query(
  `select
    (select count(*)::int from public.comun_relata_cases where report_id = $1) as cases,
    (select count(*)::int from public.comun_relata_consents where case_id = $2) as consents,
    (select count(*)::int from public.comun_relata_status_events where case_id = $2) as events`,
  [reportId, caseId],
);
assert.deepEqual(counts.rows[0], { cases: 1, consents: 1, events: 4 });

await assert.rejects(
  asRole("anon", (client) =>
    client.query("select count(*) from private.comun_relata_reports"),
  ),
  /permission denied/,
);
await assert.rejects(
  asRole("anon", (client) =>
    client.query("select count(*) from public.comun_relata_cases"),
  ),
  /permission denied/,
);

const ordinarySubject = randomUUID();
await assert.rejects(
  asRole(
    "authenticated",
    (client) => client.query("select count(*) from public.comun_relata_cases"),
    ordinarySubject,
  ),
  /permission denied/,
);

const adminSubject = randomUUID();
await postgres.query(
  `insert into public.comun_admin_users(user_id,email,role,is_active)
   values ($1,$2,'admin',true)`,
  [adminSubject, `relata-admin-${adminSubject}@example.invalid`],
);
await assert.rejects(
  asRole(
    "authenticated",
    (client) => client.query("select count(*) from public.comun_relata_cases"),
    adminSubject,
  ),
  /permission denied/,
);

await assert.rejects(
  postgres.query(
    "update public.comun_relata_status_events set result_code='RELATA_MUTATED' where case_id=$1",
    [caseId],
  ),
  /COMUN_RELATA_EVENT_APPEND_ONLY/,
);
await assert.rejects(
  postgres.query(
    "delete from public.comun_relata_status_events where case_id=$1",
    [caseId],
  ),
  /COMUN_RELATA_EVENT_APPEND_ONLY/,
);
await assert.rejects(
  postgres.query(
    `insert into public.comun_relata_public_snapshots(case_id,public_summary,approximate_location)
     values ($1,'bloqueado','{}'::jsonb)`,
    [caseId],
  ),
  /COMUN_RELATA_PUBLICATION_BLOCKED_48_0B/,
);
await assert.rejects(
  postgres.query(
    "update public.comun_relata_cases set protocol_kind='official',is_official=true,official_protocol='X' where id=$1",
    [caseId],
  ),
  /COMUN_RELATA_PROTOCOL_IMMUTABLE/,
);

const security = await postgres.query(`
  select
    count(*) filter (where relrowsecurity and relforcerowsecurity)::int as protected_tables,
    count(*)::int as total_tables
  from pg_class
  where oid in (
    'private.comun_relata_reports'::regclass,
    'private.comun_relata_private_locations'::regclass,
    'public.comun_relata_cases'::regclass,
    'public.comun_relata_consents'::regclass,
    'public.comun_relata_status_events'::regclass,
    'public.comun_relata_public_snapshots'::regclass
  )
`);
assert.deepEqual(security.rows[0], { protected_tables: 6, total_tables: 6 });

const definerSearchPaths = await postgres.query(`
  select count(*)::int as count
  from pg_proc
  where proname like 'comun_relata_%'
    and prosecdef
    and coalesce(array_to_string(proconfig, ','), '') not like '%search_path=""%'
    and coalesce(array_to_string(proconfig, ','), '') not like '%search_path=%'
`);
assert.equal(definerSearchPaths.rows[0].count, 0);

const grants = await postgres.query(`
  select count(*)::int as count
  from information_schema.role_table_grants
  where table_name like 'comun_relata_%'
    and grantee in ('PUBLIC','anon')
`);
assert.equal(grants.rows[0].count, 0);

const rpcGrants = await postgres.query(`
  select
    count(*) filter (where has_function_privilege('anon', p.oid, 'execute'))::int as anon,
    count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute'))::int as authenticated,
    count(*) filter (where has_function_privilege('service_role', p.oid, 'execute'))::int as service_role
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('comun_relata_create','comun_relata_get_receipt','comun_relata_withdraw')
`);
assert.deepEqual(rpcGrants.rows[0], {
  anon: 0,
  authenticated: 0,
  service_role: 3,
});

const withdrawal = await asRole("service_role", (client) =>
  client.query("select * from public.comun_relata_withdraw($1,$2)", [
    firstCreate.rows[0].protocol,
    first.receiptSecret,
  ]),
);
assert.equal(withdrawal.rows[0].state, "withdrawn");
assert.equal(withdrawal.rows[0].timeline.length, 5);
const withdrawalAgain = await asRole("service_role", (client) =>
  client.query("select * from public.comun_relata_withdraw($1,$2)", [
    firstCreate.rows[0].protocol,
    first.receiptSecret,
  ]),
);
assert.equal(withdrawalAgain.rows[0].timeline.length, 5);

const evidenceA = fixture({
  text: "Poste apagado perto da praça durante a noite.",
});
const evidenceB = fixture({
  text: "Outro ponto de iluminação apagado na mesma praça.",
});
const evidenceACreate = await createReport(evidenceA);
const evidenceBCreate = await createReport(evidenceB);
const sharedCell = randomBytes(32);
const otherCell = randomBytes(32);

const location = await asRole("service_role", (client) =>
  client.query(
    `select * from public.comun_relata_add_location(
      $1,$2,'device','under_25m',now(),$3,$4,$5,'relata-location-key-v1',null,'none','unreviewed'
    )`,
    [
      evidenceACreate.rows[0].protocol,
      evidenceA.receiptSecret,
      randomBytes(64),
      randomBytes(12),
      randomBytes(16),
    ],
  ),
);
assert.deepEqual(location.rows[0], {
  location_state: "added_private",
  grouping_allowed: true,
});

const firstGrouping = await asRole("service_role", (client) =>
  client.query(
    `select * from public.comun_relata_associate_collective(
      $1,$2,'auto_link_high_confidence',$3::bytea[],now()-interval '21 days'
    )`,
    [
      evidenceACreate.rows[0].protocol,
      evidenceA.receiptSecret,
      [sharedCell, otherCell],
    ],
  ),
);
assert.equal(firstGrouping.rows[0].grouping_state, "new_collective_case");
assert.equal(firstGrouping.rows[0].active_members_count, 1);

const secondGrouping = await asRole("service_role", (client) =>
  client.query(
    `select * from public.comun_relata_associate_collective(
      $1,$2,'auto_link_high_confidence',$3::bytea[],now()-interval '21 days'
    )`,
    [
      evidenceBCreate.rows[0].protocol,
      evidenceB.receiptSecret,
      [sharedCell],
    ],
  ),
);
assert.equal(
  secondGrouping.rows[0].grouping_state,
  "auto_link_high_confidence",
);
assert.equal(secondGrouping.rows[0].active_members_count, 2);

const attachmentIds = [randomUUID(), randomUUID(), randomUUID()];
for (const attachmentId of attachmentIds) {
  const started = await asRole("service_role", (client) =>
    client.query(
      "select * from public.comun_relata_begin_attachment($1,$2,$3,'image/jpeg','under_1mb')",
      [
        evidenceACreate.rows[0].protocol,
        evidenceA.receiptSecret,
        attachmentId,
      ],
    ),
  );
  assert.equal(started.rowCount, 1);
}
await assert.rejects(
  asRole("service_role", (client) =>
    client.query(
      "select * from public.comun_relata_begin_attachment($1,$2,$3,'image/jpeg','under_1mb')",
      [evidenceACreate.rows[0].protocol, evidenceA.receiptSecret, randomUUID()],
    ),
  ),
  /COMUN_RELATA_ATTACHMENT_LIMIT/,
);

const concurrentPhotos = fixture({
  text: "Duas fotos privadas serão iniciadas ao mesmo tempo.",
});
const concurrentPhotosCreate = await createReport(concurrentPhotos);
const concurrentPhotoIds = [randomUUID(), randomUUID()];
const concurrentPhotoStarts = await Promise.all(
  concurrentPhotoIds.map((attachmentId) =>
    asRole("service_role", (client) =>
      client.query(
        "select * from public.comun_relata_begin_attachment($1,$2,$3,'image/jpeg','under_1mb')",
        [
          concurrentPhotosCreate.rows[0].protocol,
          concurrentPhotos.receiptSecret,
          attachmentId,
        ],
      ),
    ),
  ),
);
assert.deepEqual(
  concurrentPhotoStarts
    .map((result) => Number(result.rows[0].label_index))
    .sort(),
  [1, 2],
);

const markedValidating = await asRole("service_role", (client) =>
  client.query(
    "select * from public.comun_relata_mark_attachment_validating($1,$2,$3)",
    [evidenceACreate.rows[0].protocol, evidenceA.receiptSecret, attachmentIds[0]],
  ),
);
assert.equal(markedValidating.rowCount, 1);
const concurrentMark = await asRole("service_role", (client) =>
  client.query(
    "select * from public.comun_relata_mark_attachment_validating($1,$2,$3)",
    [evidenceACreate.rows[0].protocol, evidenceA.receiptSecret, attachmentIds[0]],
  ),
);
assert.equal(concurrentMark.rowCount, 0);
const finalized = await asRole("service_role", (client) =>
  client.query(
    `select * from public.comun_relata_finalize_attachment(
      $1,$2,$3,'image/jpeg',1024,512,80,60,$4,$5
    )`,
    [
      evidenceACreate.rows[0].protocol,
      evidenceA.receiptSecret,
      attachmentIds[0],
      randomBytes(32),
      randomBytes(32),
    ],
  ),
);
assert.equal(finalized.rows[0].attachment_state, "sealed_private");
const ownAttachmentRead = await asRole("service_role", (client) =>
  client.query(
    "select * from public.comun_relata_authorize_attachment_read($1,$2,$3)",
    [evidenceACreate.rows[0].protocol, evidenceA.receiptSecret, attachmentIds[0]],
  ),
);
const crossAttachmentRead = await asRole("service_role", (client) =>
  client.query(
    "select * from public.comun_relata_authorize_attachment_read($1,$2,$3)",
    [evidenceBCreate.rows[0].protocol, evidenceB.receiptSecret, attachmentIds[0]],
  ),
);
assert.equal(ownAttachmentRead.rowCount, 1);
assert.equal(crossAttachmentRead.rowCount, 0);

const safeEvidence = await asRole("service_role", (client) =>
  client.query("select * from public.comun_relata_get_evidence_state($1,$2)", [
    evidenceACreate.rows[0].protocol,
    evidenceA.receiptSecret,
  ]),
);
const safeEvidenceText = JSON.stringify(safeEvidence.rows[0]);
assert.equal(safeEvidence.rows[0].evidence.photos[0].label, "Foto 1");
assert.equal(safeEvidenceText.includes("quarantine/"), false);
assert.equal(safeEvidenceText.includes("sealed/"), false);
assert.equal(safeEvidenceText.includes("encrypted_value"), false);
assert.equal(safeEvidenceText.includes(sharedCell.toString("hex")), false);

const emergency = fixture({
  text: "Há fogo ativo e chamas no terreno.",
  category: "active_fire",
  urgency: "emergency",
  privacyClass: "high_risk",
});
const emergencyCreate = await createReport(emergency);
const emergencyGrouping = await asRole("service_role", (client) =>
  client.query(
    `select * from public.comun_relata_associate_collective(
      $1,$2,'auto_link_high_confidence',$3::bytea[],now()-interval '1 hour'
    )`,
    [emergencyCreate.rows[0].protocol, emergency.receiptSecret, [sharedCell]],
  ),
);
assert.equal(emergencyGrouping.rows[0].grouping_state, "never_auto_link");
const emergencyKeys = await postgres.query(
  `select count(*)::int as count from private.comun_relata_case_match_keys key
   join public.comun_relata_cases relata_case on relata_case.id=key.individual_case_id
   where relata_case.protocol=$1`,
  [emergencyCreate.rows[0].protocol],
);
assert.equal(emergencyKeys.rows[0].count, 0);

await assert.rejects(
  postgres.query(
    "delete from public.comun_relata_case_match_events where individual_case_id=(select id from public.comun_relata_cases where protocol=$1)",
    [evidenceACreate.rows[0].protocol],
  ),
  /COMUN_RELATA_EVIDENCE_EVENT_APPEND_ONLY/,
);

const evidenceWithdrawal = await asRole("service_role", (client) =>
  client.query("select * from public.comun_relata_withdraw($1,$2)", [
    evidenceACreate.rows[0].protocol,
    evidenceA.receiptSecret,
  ]),
);
assert.equal(evidenceWithdrawal.rows[0].state, "withdrawn");
const withdrawnRead = await asRole("service_role", (client) =>
  client.query(
    "select * from public.comun_relata_authorize_attachment_read($1,$2,$3)",
    [evidenceACreate.rows[0].protocol, evidenceA.receiptSecret, attachmentIds[0]],
  ),
);
assert.equal(withdrawnRead.rowCount, 0);
const withdrawnEvidence = await postgres.query(
  `select
    (select count(*)::int from private.comun_relata_attachments where report_id=(select report_id from public.comun_relata_cases where protocol=$1) and state='withdrawn') as attachments,
    (select count(*)::int from public.comun_relata_case_memberships membership join public.comun_relata_cases relata_case on relata_case.id=membership.individual_case_id where relata_case.protocol=$1 and membership.active) as active_memberships`,
  [evidenceACreate.rows[0].protocol],
);
assert.deepEqual(withdrawnEvidence.rows[0], {
  attachments: 3,
  active_memberships: 0,
});

for (const role of ["anon", "authenticated"]) {
  await assert.rejects(
    asRole(role, (client) =>
      client.query("select count(*) from public.comun_relata_collective_cases"),
    ),
    /permission denied/,
  );
  await assert.rejects(
    asRole(role, (client) =>
      client.query("select count(*) from private.comun_relata_attachments"),
    ),
    /permission denied/,
  );
}

const evidenceSecurity = await postgres.query(`
  select count(*) filter (where relrowsecurity and relforcerowsecurity)::int as protected_tables,
    count(*)::int as total_tables
  from pg_class where oid in (
    'private.comun_relata_attachments'::regclass,
    'private.comun_relata_case_match_keys'::regclass,
    'public.comun_relata_evidence_consents'::regclass,
    'public.comun_relata_collective_cases'::regclass,
    'public.comun_relata_case_memberships'::regclass,
    'public.comun_relata_case_match_events'::regclass
  )
`);
assert.deepEqual(evidenceSecurity.rows[0], {
  protected_tables: 6,
  total_tables: 6,
});

const publicSnapshots = await postgres.query(
  "select count(*)::int as count from public.comun_relata_public_snapshots",
);
assert.equal(publicSnapshots.rows[0].count, 0);

// 48.0D: only sanitized, synthetic projection rows are created in the
// disposable database. No report text, protocol or exact location is used.
const projectionCases = [
  ["public_lighting", "visible_local_preview", 1, -22.501, -44.101, 300],
  ["power_distribution", "suppressed", 1, -22.502, -44.102, 800],
  ["power_distribution", "visible_local_preview", 2, -22.503, -44.103, 800],
  ["smoke_or_environmental_trace", "visible_local_preview", 1, -22.504, -44.104, 1000],
];
for (const [category, state, reports, latitude, longitude, radius] of projectionCases) {
  const collectiveId = randomUUID();
  const projectionId = randomUUID();
  await postgres.query(
    `insert into public.comun_relata_collective_cases
      (id,category,collective_urgency,state,match_rule,match_rule_version,active_members_count,first_report_at,last_report_at,confidence_level)
     values ($1,$2,'routine','active','new_collective_case','relata-match-v1',$3,now()-interval '1 day',now(),'high')`,
    [collectiveId, category, reports],
  );
  await postgres.query(
    `insert into private.comun_relata_public_projection_candidates
      (collective_case_id,cell_x,cell_y,grid_meters,public_latitude,public_longitude,uncertainty_radius_meters,source_contract)
     values ($1,100,200,$2,$3,$4,$5,'relata-public-projection-v1')`,
    [collectiveId, radius, latitude, longitude, radius],
  );
  await postgres.query(
    `insert into private.comun_relata_public_projections
      (public_id,collective_case_id,category,community_state,report_count,first_seen_date,last_activity_date,public_latitude,public_longitude,uncertainty_radius_meters,policy_version,eligibility_reason,projection_state)
     values ($1,$2,$3,'active',$4,current_date-1,current_date,$5,$6,$7,'relata-public-projection-v1','allowlisted_rule',$8)`,
    [projectionId, collectiveId, category, reports, latitude, longitude, radius, state],
  );
  await postgres.query(
    "insert into private.comun_relata_public_projection_events(public_id,event_type,result_code) values($1,'created','RELATA_PUBLIC_PROJECTION_CREATED')",
    [projectionId],
  );
  if (category === "public_lighting") {
    globalThis.__relataProjectionId = projectionId;
  }
}
const projectionId = globalThis.__relataProjectionId;
assert.ok(projectionId);
const listedProjection = await asRole("service_role", (client) =>
  client.query("select * from public.comun_relata_public_list($1,$2,500)", ["public_lighting", "visible_local_preview"]),
);
assert.equal(listedProjection.rowCount, 1);
const safeProjectionText = JSON.stringify(listedProjection.rows[0]);
for (const forbidden of ["report_id", "case_id", "protocol", "ciphertext", "nonce", "tag", "object_key", "filename", "private_note"]) {
  assert.equal(safeProjectionText.includes(forbidden), false);
}
const detailProjection = await asRole("service_role", (client) =>
  client.query("select * from public.comun_relata_public_get($1)", [projectionId]),
);
assert.equal(detailProjection.rowCount, 1);
const reportCountBeforeConfirmation = detailProjection.rows[0].report_count;
const tokenHash = randomBytes(32);
const confirmationA = await asRole("service_role", (client) =>
  client.query("select * from public.comun_relata_public_confirm($1,$2,false)", [projectionId, tokenHash]),
);
const confirmationB = await asRole("service_role", (client) =>
  client.query("select * from public.comun_relata_public_confirm($1,$2,false)", [projectionId, tokenHash]),
);
assert.deepEqual(confirmationA.rows[0], { active: true, confirmation_count: 1 });
assert.deepEqual(confirmationB.rows[0], { active: true, confirmation_count: 1 });
const confirmationUndo = await asRole("service_role", (client) =>
  client.query("select * from public.comun_relata_public_confirm($1,$2,true)", [projectionId, tokenHash]),
);
assert.deepEqual(confirmationUndo.rows[0], { active: false, confirmation_count: 0 });
const reportCountAfterConfirmation = await postgres.query(
  "select report_count,confirmation_count from private.comun_relata_public_projections where public_id=$1",
  [projectionId],
);
assert.deepEqual(reportCountAfterConfirmation.rows[0], { report_count: reportCountBeforeConfirmation, confirmation_count: 0 });
await postgres.query("update private.comun_relata_public_projections set uncertainty_radius_meters=1 where public_id=$1", [projectionId]);
const precision = await postgres.query("select uncertainty_radius_meters from private.comun_relata_public_projections where public_id=$1", [projectionId]);
assert.equal(Number(precision.rows[0].uncertainty_radius_meters), 300);
await assert.rejects(
  postgres.query("delete from private.comun_relata_public_projection_events where public_id=$1", [projectionId]),
  /COMUN_RELATA_EVIDENCE_EVENT_APPEND_ONLY/,
);
await assert.rejects(
  postgres.query(
    `insert into private.comun_relata_public_projections
      (collective_case_id,category,community_state,first_seen_date,last_activity_date,public_latitude,public_longitude,uncertainty_radius_meters,policy_version,eligibility_reason,projection_state)
     values ($1,'active_fire','active',current_date,current_date,0,0,1000,'relata-public-projection-v1','blocked','blocked')`,
    [randomUUID()],
  ),
  /violates foreign key|violates check constraint/,
);
for (const role of ["anon", "authenticated"]) {
  await assert.rejects(
    asRole(role, (client) => client.query("select count(*) from private.comun_relata_public_projections")),
    /permission denied/,
  );
  await assert.rejects(
    asRole(role, (client) => client.query("select * from public.comun_relata_public_list(null,'visible_local_preview',10)")),
    /permission denied/,
  );
}
const projectionSecurity = await postgres.query(`
  select count(*) filter (where relrowsecurity and relforcerowsecurity)::int as protected_tables,
    count(*)::int as total_tables
  from pg_class where oid in (
    'private.comun_relata_public_projection_candidates'::regclass,
    'private.comun_relata_public_projections'::regclass,
    'private.comun_relata_public_projection_events'::regclass,
    'private.comun_relata_public_confirmations'::regclass,
    'private.comun_relata_public_confirmation_events'::regclass
  )
`);
assert.deepEqual(projectionSecurity.rows[0], { protected_tables: 5, total_tables: 5 });

const persistedInvariant = await postgres.query(`
  select count(*)::int as invalid
  from public.comun_relata_cases
  where protocol_kind <> 'comun' or is_official or official_protocol is not null
`);
assert.equal(persistedInvariant.rows[0].invalid, 0);
await postgres.end();

console.log(
  JSON.stringify({
    result: "COMUN_RELATA_48_0D_DB_GREEN",
    roles: ["PUBLIC", "anon", "authenticated", "admin", "non_admin", "service_role"],
    idempotency: ["sequential", "concurrent", "payload_conflict"],
    privacy: "no_private_values_emitted",
    evidence: ["aes_256_gcm_contract", "private_photos", "collective_cases", "sanitized_projection", "community_confirmation", "projection_rls"],
    remote: "not_contacted",
  }),
);
