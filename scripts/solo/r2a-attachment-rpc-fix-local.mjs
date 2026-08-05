import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

const databaseUrl = process.env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL ?? "";
if (!/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):\d+\/postgres(?:[/?]|$)/.test(databaseUrl)) {
  throw new Error("COMUN_R2A_ATTACHMENT_FIX_LOCAL_DATABASE_REQUIRED");
}

const { Client } = pg;
const receiptSecret = randomBytes(32).toString("base64url");
const idempotencyKey = randomBytes(32).toString("base64url");
let protocol;
let reportId;
const client = new Client({ connectionString: databaseUrl });
await client.connect();

async function callAttachment(db, id, secret = receiptSecret, mime = "image/png") {
  return db.query(
    "select * from public.comun_relata_begin_attachment($1,$2,$3,$4,$5)",
    [protocol, secret, id, mime, "under_1mb"],
  );
}

try {
  const created = await client.query(
    "select * from public.comun_relata_create($1,$2,$3,$4::jsonb,$5,$6,$7,$8::jsonb,$9,$10)",
    [
      idempotencyKey,
      receiptSecret,
      "Teste focal privado de anexo.",
      JSON.stringify({ blocked: "sim" }),
      "sidewalk_accessibility",
      "attention",
      "relata-routing-v1",
      JSON.stringify({ category: "sidewalk_accessibility", source: "r2a-f1" }),
      "restricted",
      "relata-consent-v1",
    ],
  );
  protocol = created.rows[0]?.protocol;
  assert.match(protocol, /^COMUN-RELATA-[A-F0-9]{16}$/);
  const caseRow = await client.query("select report_id from public.comun_relata_cases where protocol=$1", [protocol]);
  reportId = caseRow.rows[0]?.report_id;
  assert.ok(reportId);

  await client.query("begin");
  await client.query(`
    create or replace function public.comun_relata_begin_attachment(
      p_protocol text, p_receipt_secret text, p_attachment_id uuid,
      p_declared_mime_type text, p_declared_size_bucket text
    ) returns table(attachment_id uuid, label_index smallint, attachment_state text)
    language plpgsql security definer set search_path=pg_catalog,private,public as $$
    declare x record; n smallint;
    begin
      select * into x from private.comun_relata_authorized_context(p_protocol,p_receipt_secret);
      if not found then return; end if;
      select coalesce(max(label_index),0)+1 into n
        from private.comun_relata_attachments where report_id=x.report_id;
      return query select p_attachment_id,n,'quarantine'::text;
    end; $$;
  `);
  await assert.rejects(
    () => callAttachment(client, randomUUID()),
    (error) => error?.code === "42702",
  );
  await client.query("rollback");

  const first = randomUUID();
  const firstResult = await callAttachment(client, first);
  assert.equal(firstResult.rows[0].attachment_id, first);
  assert.equal(firstResult.rows[0].label_index, 1);
  assert.equal(firstResult.rows[0].attachment_state, "quarantine");

  const left = new Client({ connectionString: databaseUrl });
  const right = new Client({ connectionString: databaseUrl });
  await Promise.all([left.connect(), right.connect()]);
  const concurrentIds = [randomUUID(), randomUUID()];
  await Promise.all([left.query("begin"), right.query("begin")]);
  const concurrent = await Promise.all([
    callAttachment(left, concurrentIds[0]),
    callAttachment(right, concurrentIds[1]),
  ]);
  const indexes = concurrent.map((result) => result.rows[0]?.label_index).sort((a, b) => a - b);
  assert.deepEqual(indexes, [2, 3]);
  await Promise.all([left.query("commit"), right.query("commit")]);
  await Promise.all([left.end(), right.end()]);

  await assert.rejects(
    () => callAttachment(client, randomUUID()),
    (error) => error?.code === "23514" && error?.message.includes("COMUN_RELATA_ATTACHMENT_LIMIT"),
  );
  assert.equal((await callAttachment(client, randomUUID(), "wrong-receipt")).rows.length, 0);
  assert.equal((await callAttachment(client, randomUUID(), receiptSecret, "image/gif")).rows.length, 0);

  for (const role of ["anon", "authenticated"]) {
    await client.query(`set role ${role}`);
    await assert.rejects(
      () => callAttachment(client, randomUUID()),
      (error) => error?.code === "42501",
    );
    await client.query("reset role");
  }

  const stored = await client.query(
    "select count(*)::int as count, min(label_index) as first, max(label_index) as last from private.comun_relata_attachments where report_id=$1",
    [reportId],
  );
  assert.deepEqual(stored.rows[0], { count: 3, first: 1, last: 3 });
  console.log(JSON.stringify({ result: "COMUN_48_1B_R2A_ATTACHMENT_RPC_FORWARD_FIX_GREEN", reproducedSqlState: "42702", indexes: [1, 2, 3], limit: "23514", publicRolesDenied: true, remote: "not_contacted" }));
} finally {
  await client.query("reset role").catch(() => {});
  if (reportId) {
    await client.query("begin").catch(() => {});
    await client.query("alter table public.comun_relata_status_events disable trigger user").catch(() => {});
    await client.query("delete from private.comun_relata_attachments where report_id=$1", [reportId]).catch(() => {});
    await client.query("delete from public.comun_relata_status_events where case_id=(select id from public.comun_relata_cases where report_id=$1)", [reportId]).catch(() => {});
    await client.query("delete from public.comun_relata_evidence_consents where case_id=(select id from public.comun_relata_cases where report_id=$1)", [reportId]).catch(() => {});
    await client.query("delete from public.comun_relata_consents where case_id=(select id from public.comun_relata_cases where report_id=$1)", [reportId]).catch(() => {});
    await client.query("alter table public.comun_relata_status_events enable trigger user").catch(() => {});
    await client.query("delete from public.comun_relata_cases where report_id=$1", [reportId]).catch(() => {});
    await client.query("delete from private.comun_relata_reports where id=$1", [reportId]).catch(() => {});
    await client.query("commit").catch(() => client.query("rollback").catch(() => {}));
  }
  await client.end();
}
